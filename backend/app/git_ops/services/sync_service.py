"""
同步服务 - 负责全量和增量同步
"""

import asyncio
import logging
import time

from app.core.config import settings
from app.git_ops.components import (
    revalidate_nextjs_cache,
)
from app.git_ops.exceptions import GitOpsConfigurationError
from app.git_ops.schema import SyncStats
from app.posts import cruds as post_crud
from app.users.model import User

from .base import BaseGitOpsService

logger = logging.getLogger(__name__)


class SyncService(BaseGitOpsService):
    """同步服务 - 负责全量和增量同步"""

    # 全局锁，防止并发同步 (类属性，跨实例共享)
    _sync_lock: asyncio.Lock = None

    @classmethod
    def _get_sync_lock(cls) -> asyncio.Lock:
        """获取同步锁（懒加载单例）"""
        if cls._sync_lock is None:
            cls._sync_lock = asyncio.Lock()
        return cls._sync_lock

    async def sync_all(self, default_user: User = None) -> SyncStats:
        """执行全量同步（扫描本地文件 -> 更新数据库）"""
        sync_lock = self._get_sync_lock()

        if sync_lock.locked():
            logger.warning("GitOps sync is already in progress, waiting for lock...")

        async with sync_lock:
            start_time = time.time()
            stats = SyncStats()

            logger.info("Starting full sync...")

            # 1. Git Pull
            _, _, _ = await self.github.pull()

            # 2. 扫描文件系统
            scanned_posts = await self.scanner.scan_all()
            scanned_map = {p.file_path: p for p in scanned_posts}
            logger.info(f"Scanned {len(scanned_posts)} files.")

            # 3. 查询数据库
            existing_posts = await post_crud.get_posts_with_source_path(self.session)
            existing_map = {p.source_path: p for p in existing_posts}

            # 4. 获取操作用户
            operating_user = await self._get_operating_user(default_user)

            # 4. 执行全量对齐 (Core Reconciliation)
            # 所有的对比、删除孤儿、更新逻辑都封装在 SyncProcessor 中
            await self.sync_processor.reconcile_full_sync(
                self.session, scanned_map, existing_map, operating_user, stats
            )

            await self.session.commit()

            # 5. (DB -> Disk) 确保分类索引文件与数据库保持同步
            await self.sync_processor.sync_categories_to_disk(
                self.session, self.container.writer, stats
            )

            # 7. 提交元数据变更到 GitHub
            if stats.added or stats.updated or stats.deleted:
                await self.github.auto_commit_metadata(
                    added_count=len(stats.added),
                    updated_count=len(stats.updated),
                    deleted_count=len(stats.deleted),
                )

            # 8. 刷新缓存
            if stats.added or stats.updated or stats.deleted:
                await revalidate_nextjs_cache(
                    settings.FRONTEND_URL, settings.REVALIDATE_SECRET
                )

            # 9. 保存 hash
            await self.hash_manager.save_current_hash()

            stats.duration = time.time() - start_time
            logger.info(
                f"Full sync completed in {stats.duration:.2f}s: "
                f"+{len(stats.added)} ~{len(stats.updated)} -{len(stats.deleted)}"
            )

            return stats

    async def sync_incremental(
        self,
        default_user: User | None = None,
        old_hash: str | None = None,
        new_hash: str | None = None,
    ) -> SyncStats:
        """执行增量同步（基于 Git Diff）

        Args:
            default_user: 默认操作用户
            old_hash: 可选，指定旧的 commit hash（用于 webhook 场景）
            new_hash: 可选，指定新的 commit hash（用于 webhook 场景）
        """
        sync_lock = self._get_sync_lock()

        if sync_lock.locked():
            logger.warning("GitOps sync is already in progress, waiting for lock...")

        async with sync_lock:
            # 1. 先 Git Pull (把远程变更拉下来)
            pull_output, pull_old_hash, pull_new_hash = await self.github.pull()

            # 2. 再获取变更文件
            # 如果提供了 hash 范围（webhook 场景），使用提供的范围
            # 否则使用 last_sync 记录和当前 HEAD 对比
            if old_hash and new_hash:
                logger.info(
                    f"Using provided hash range: {old_hash[:7]}..{new_hash[:7]}"
                )
                changed_files = await self.hash_manager.get_changed_files_between(
                    old_hash, new_hash
                )
            elif pull_old_hash != pull_new_hash:
                # Pull 产生了变更，使用 pull 前后的 hash
                logger.info(
                    f"Using pull hash range: {pull_old_hash[:7]}..{pull_new_hash[:7]}"
                )
                changed_files = await self.hash_manager.get_changed_files_between(
                    pull_old_hash, pull_new_hash
                )
            else:
                # Pull 没有变更，使用传统的 last_sync 对比
                changed_files = (
                    await self.hash_manager.get_changed_files_since_last_sync()
                )

            if changed_files is None:
                logger.warning(
                    "No last sync record found (hash missing). Cannot perform incremental sync."
                )
                raise GitOpsConfigurationError(
                    "Missing last sync state. Please run a full sync first."
                )

            stats = SyncStats()
            if not changed_files:
                logger.info("No new commits or changed files detected.")
                return stats

            logger.info("Starting incremental sync...")

            # 5. 获取操作用户
            operating_user = await self._get_operating_user(default_user)

            # 6. 处理变更文件 (Disk -> DB 阶段)
            target_paths = [
                path for _, path in changed_files if path.endswith((".md", ".mdx"))
            ]

            if target_paths:
                # 优化：只查询涉及到的路径
                existing_posts = await post_crud.get_posts_by_source_paths(
                    self.session, target_paths
                )
                existing_map = {p.source_path: p for p in existing_posts}
            else:
                existing_map = {}

            # 7. 执行增量对齐
            await self.sync_processor.reconcile_incremental_sync(
                self.session, changed_files, existing_map, operating_user, stats
            )

            await self.session.commit()

            # 6. (DB -> Disk) 确保所有分类都有 index.md 并保持同步
            #    这一步是复用的，无论全量还是增量，都值得检查一遍分类元数据的一致性
            await self.sync_processor.sync_categories_to_disk(
                self.session, self.container.writer, stats
            )

            # 8. 检查是否真的有产出
            if not stats.added and not stats.updated and not stats.deleted:
                logger.info("No changes detected in incremental sync.")
                return stats

            # 9. 提交元数据变更到 GitHub
            await self.github.auto_commit_metadata(
                added_count=len(stats.added),
                updated_count=len(stats.updated),
                deleted_count=len(stats.deleted),
            )

            # 10. 刷新缓存
            await revalidate_nextjs_cache(
                settings.FRONTEND_URL, settings.REVALIDATE_SECRET
            )

            # 11. 保存 hash
            await self.hash_manager.save_current_hash()

            logger.info(
                f"Incremental sync completed: "
                f"+{len(stats.added)} ~{len(stats.updated)} -{len(stats.deleted)}"
            )

            return stats
