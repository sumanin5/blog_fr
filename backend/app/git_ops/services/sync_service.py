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
from app.git_ops.exceptions import GitOpsConfigurationError, collect_errors
from app.git_ops.schema import SyncStats
from app.posts import cruds as post_crud
from app.posts import services as post_service
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
            await self.github.pull()

            # 2. 扫描文件系统
            scanned_posts = await self.scanner.scan_all()
            scanned_map = {p.file_path: p for p in scanned_posts}
            logger.info(f"Scanned {len(scanned_posts)} files.")

            # 3. 查询数据库
            existing_posts = await post_crud.get_posts_with_source_path(self.session)
            existing_map = {p.source_path: p for p in existing_posts}

            # 4. 获取操作用户
            operating_user = await self._get_operating_user(default_user)

            # 5. 删除数据库中多余的记录（文件系统中不存在的）
            for db_path, post in existing_map.items():
                if db_path not in scanned_map:
                    async with collect_errors(stats, f"Deleting orphaned {db_path}"):
                        logger.info(
                            f"Deleting orphaned post: {db_path} (slug={post.slug})"
                        )
                        await post_service.delete_post(
                            self.session, post.id, current_user=operating_user
                        )
                        stats.deleted.append(str(db_path))

            # 6. 处理所有文件（新增或更新）
            processed_post_ids = set()
            for file_path, scanned in scanned_map.items():
                async with collect_errors(stats, f"Processing {file_path}"):
                    await self.sync_processor.process_scanned_file(
                        self.session,
                        file_path,
                        scanned,
                        existing_map,
                        operating_user,
                        stats,
                        processed_post_ids,
                    )

            await self.session.commit()

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

    async def sync_incremental(self, default_user: User = None) -> SyncStats:
        """执行增量同步（基于 Git Diff）"""
        sync_lock = self._get_sync_lock()

        if sync_lock.locked():
            logger.warning("GitOps sync is already in progress, waiting for lock...")

        async with sync_lock:
            # 1. 获取变更文件（如果没有上次同步记录，返回 None）
            changed_files = await self.hash_manager.get_changed_files_since_last_sync()

            if changed_files is None:
                logger.warning(
                    "No last sync record found (hash missing). Cannot perform incremental sync."
                )
                raise GitOpsConfigurationError(
                    "Missing last sync state. Please run a full sync first."
                )

            stats = SyncStats()

            # 2. Git Pull
            await self.github.pull()

            # 3. 检查是否有新 commit
            if not await self.hash_manager.has_new_commits():
                logger.info("No new commits detected. No action needed.")
                return SyncStats()

            # 4. 重新获取变更文件（pull 后可能有新变更）
            changed_files = await self.hash_manager.get_changed_files_since_last_sync()

            if not changed_files:
                logger.info("No file changes detected.")
                return SyncStats()

            logger.info(f"Incremental sync: found {len(changed_files)} changed files.")

            # 5. 获取操作用户
            operating_user = await self._get_operating_user(default_user)

            # 6. 预加载数据库数据
            existing_posts = await post_crud.get_posts_with_source_path(self.session)
            existing_map = {p.source_path: p for p in existing_posts}

            # 7. 处理变更文件
            processed_post_ids = set()
            for status, file_path in changed_files:
                # 只处理 MD/MDX 文件
                if not file_path.endswith((".md", ".mdx")):
                    continue

                async with collect_errors(stats, f"Processing {status} {file_path}"):
                    await self.sync_processor.process_file_change(
                        self.session,
                        file_path,
                        status,
                        existing_map,
                        operating_user,
                        stats,
                        processed_post_ids,
                    )

            await self.session.commit()

            # 8. 提交元数据变更到 GitHub
            if stats.added or stats.updated or stats.deleted:
                await self.github.auto_commit_metadata(
                    added_count=len(stats.added),
                    updated_count=len(stats.updated),
                    deleted_count=len(stats.deleted),
                )

            # 9. 刷新缓存
            if stats.added or stats.updated or stats.deleted:
                await revalidate_nextjs_cache(
                    settings.FRONTEND_URL, settings.REVALIDATE_SECRET
                )

            # 10. 保存 hash
            await self.hash_manager.save_current_hash()

            logger.info(
                f"Incremental sync completed: "
                f"+{len(stats.added)} ~{len(stats.updated)} -{len(stats.deleted)}"
            )

            return stats
