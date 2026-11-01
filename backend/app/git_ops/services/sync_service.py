"""
同步服务 - 负责全量和增量同步
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

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

# 固定 bigint：所有 worker 和同一工作目录的写入入口共用。
SYNC_ADVISORY_LOCK_KEY: int = 0x4749544F5053


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

    @classmethod
    @asynccontextmanager
    async def repository_lock(cls, session):
        """等待进程内锁和跨进程锁；独立连接持锁，不受业务 commit 影响。"""
        async with cls._get_sync_lock():
            bind = session.bind
            engine = bind.engine if isinstance(bind, AsyncConnection) else bind
            async with engine.connect() as connection:
                try:
                    await connection.execute(
                        text("SELECT pg_advisory_lock(:key)"),
                        {"key": SYNC_ADVISORY_LOCK_KEY},
                    )
                    # session 级锁跨事务保留，避免长时间闲置事务。
                    await connection.commit()
                    yield
                finally:
                    # 即使业务异常或等待被取消，也不把持锁连接归还连接池。
                    try:
                        await connection.rollback()
                        await connection.execute(
                            text("SELECT pg_advisory_unlock(:key)"),
                            {"key": SYNC_ADVISORY_LOCK_KEY},
                        )
                        await connection.commit()
                    except BaseException:
                        await connection.invalidate()
                        raise

    async def sync_all(self, default_user: User = None) -> SyncStats:
        """执行全量同步（扫描本地文件 -> 更新数据库）"""
        async with self.repository_lock(self.session):
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
            if not stats.errors:
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
            old_hash: 兼容旧调用方；同步范围始终由上次成功记录决定
            new_hash: 兼容旧调用方；同步目标始终为当前工作区（包含 HEAD）
        """
        async with self.repository_lock(self.session):
            # 始终从上次成功同步的位置重放，不能被本次 pull/webhook 范围截断。
            await self.github.pull()
            changed_files = await self.hash_manager.get_changed_files_since_last_sync()

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
                path
                for _, *paths in changed_files
                for path in paths
                if path.endswith((".md", ".mdx"))
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
                if not stats.errors:
                    await self.hash_manager.save_current_hash()
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
            if not stats.errors:
                await self.hash_manager.save_current_hash()

            logger.info(
                f"Incremental sync completed: "
                f"+{len(stats.added)} ~{len(stats.updated)} -{len(stats.deleted)}"
            )

            return stats
