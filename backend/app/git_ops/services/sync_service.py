"""
同步服务 - 负责全量和增量同步
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.core.config import settings
from app.git_ops.components import (
    revalidate_nextjs_cache,
)
from app.git_ops.components.path_utils import (
    is_source_path_within_repository,
    normalize_source_path,
)
from app.git_ops.components.scanner.policy import is_content_path
from app.git_ops.exceptions import GitOpsConfigurationError
from app.git_ops.schema import SyncError, SyncStats
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
    async def database_lock(cls, session):
        """PostgreSQL advisory lock；没有真实数据库连接（单元测试）时跳过。"""
        bind = getattr(session, "bind", None)
        if not isinstance(bind, (AsyncEngine, AsyncConnection)):
            yield
            return
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

    @classmethod
    @asynccontextmanager
    async def repository_lock(cls, session):
        """等待进程内锁和跨进程数据库锁。"""
        async with cls._get_sync_lock():
            async with cls.database_lock(session):
                yield

    async def sync_all(self, default_user: User = None) -> SyncStats:
        """执行全量同步（扫描本地文件 -> 更新数据库）"""
        sync_lock = self._get_sync_lock()

        if sync_lock.locked():
            logger.warning("GitOps sync is already in progress, waiting for lock...")

        async with sync_lock, self.container.repository_lock(), self.database_lock(self.session):
            try:
                return await self._sync_all_locked(default_user)
            except Exception:
                # 失败标记必须在锁内写入，避免与另一个 worker 的成功清理竞态。
                self.hash_manager.mark_failed()
                raise

    async def _sync_all_locked(self, default_user=None) -> SyncStats:
        start_time = time.time()
        stats = SyncStats()

        logger.info("Starting full sync...")

        # Production pulls Git; local editing can import a plain directory offline.
        if settings.GIT_PULL_BEFORE_SYNC:
            await self.github.pull()
        await self.container.validate_content()

        # 2. 扫描文件系统
        scanned_posts = await self.scanner.scan_all()
        scanned_map = {p.file_path: p for p in scanned_posts}
        logger.info(f"Scanned {len(scanned_posts)} files.")

        # 扫描失败的文件必须进入错误列表，否则本轮会被误判为成功并推进游标。
        for failed_path, error in getattr(
            self.scanner, "last_scan_errors", {}
        ).items():
            stats.errors.append(
                SyncError(
                    context=f"Scanning {failed_path}",
                    code="SCAN_ERROR",
                    message=error,
                )
            )

        # 3. 查询数据库
        existing_posts = await post_crud.get_posts_with_source_path(self.session)
        existing_map = {
            normalize_source_path(p.source_path, self.content_dir): p
            for p in existing_posts
            if p.source_path
        }

        # 历史绝对路径可能因仓库搬迁指向当前内容仓库之外。此类记录不能
        # 被当成普通孤儿删除；保留记录并阻止本轮清理，等待人工修复。
        outside_paths = sorted(
            str(p.source_path)
            for p in existing_posts
            if p.source_path
            and not is_source_path_within_repository(
                p.source_path, self.content_dir
            )
        )
        if outside_paths:
            self.scanner.last_scan_incomplete = True
            preview = ", ".join(outside_paths[:5])
            stats.errors.append(
                SyncError(
                    context="Checking source paths",
                    code="SOURCE_PATH_OUTSIDE",
                    message=(
                        f"{len(outside_paths)} 篇数据库文章的 source_path "
                        f"位于内容仓库之外，已跳过孤儿删除: {preview}"
                    ),
                )
            )

        # 全量扫描安全性校验：工作区扫描结果必须覆盖 Git 跟踪的 Markdown。
        # 目录为空、挂载错误或权限问题不能把数据库文章误判为“已删除”。
        if not (self.content_dir / ".git").exists():
            logger.warning(
                "Content directory is not a Git repository; "
                "skipping tracked-file safety check."
            )
        else:
            try:
                tracked_files = set(
                    await self.git_client.list_tracked_markdown_files()
                )
            except Exception as exc:
                self.scanner.last_scan_incomplete = True
                stats.errors.append(
                    SyncError(
                        context="Checking tracked files",
                        code="SCAN_INCOMPLETE",
                        message=f"无法读取 Git 跟踪文件列表: {exc}",
                    )
                )
            else:
                expected_paths = {
                    path
                    for path in tracked_files
                    if is_content_path(path)
                }
                missing_paths = expected_paths - set(scanned_map)
                if missing_paths:
                    self.scanner.last_scan_incomplete = True
                    preview = ", ".join(sorted(missing_paths)[:5])
                    stats.errors.append(
                        SyncError(
                            context="Checking scanned files",
                            code="SCAN_INCOMPLETE",
                            message=(
                                f"全量扫描缺少 {len(missing_paths)} 个 Git 跟踪文件: "
                                f"{preview}"
                            ),
                        )
                    )

        if existing_map and not scanned_map:
            # 空扫描可能是挂载错误，也可能是最后一个文件被合法删除。
            # 只有 Git 历史能证明数据库中的每个源文件都被删除时才允许清理。
            deletion_proven = False
            try:
                last_hash = self.hash_manager.get_last_hash()
                current_hash = await self.git_client.get_current_hash()
                if last_hash and current_hash:
                    changes = await self.hash_manager.get_changed_files_between(
                        last_hash, current_hash
                    )
                    deleted_paths = {
                        path.replace("\\", "/")
                        for status, path in changes
                        if status == "D"
                    }
                    deletion_proven = set(existing_map).issubset(deleted_paths)
            except Exception as exc:
                logger.warning(
                    "Failed to verify empty-scan deletions against Git history: %s",
                    exc,
                )

            if not deletion_proven:
                self.scanner.last_scan_incomplete = True
                stats.errors.append(
                    SyncError(
                        context="Full sync safety check",
                        code="SCAN_INCOMPLETE",
                        message=(
                            "扫描结果为空但数据库仍有 Git 来源文章，"
                            "且 Git 历史无法证明这些文件已被删除；"
                            "已跳过孤儿删除。请检查 CONTENT_DIR 和仓库挂载。"
                        ),
                    )
                )

        # 4. 获取操作用户
        operating_user = await self._get_operating_user(default_user)

        # 4. 执行全量对齐 (Core Reconciliation)
        # 所有的对比、删除孤儿、更新逻辑都封装在 SyncProcessor 中
        await self.sync_processor.reconcile_full_sync(
            self.session, scanned_map, existing_map, operating_user, stats
        )

        await self.session.commit()

        # Git 是内容来源；导入只更新数据库，不修改或提交源文件。
        # 刷新缓存
        if stats.added or stats.updated or stats.deleted:
            await revalidate_nextjs_cache(
                settings.FRONTEND_URL, settings.REVALIDATE_SECRET
            )

        # 有失败时保留游标并标记需要全量对账；成功后清除标记并推进游标。
        if stats.errors:
            self.hash_manager.mark_failed()
        else:
            self.hash_manager.clear_failed()
            if settings.GIT_PULL_BEFORE_SYNC:
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
        sync_lock = self._get_sync_lock()

        if sync_lock.locked():
            logger.warning("GitOps sync is already in progress, waiting for lock...")

        async with sync_lock, self.container.repository_lock(), self.database_lock(self.session):
            try:
                return await self._sync_incremental_locked(
                    default_user, old_hash, new_hash
                )
            except Exception:
                # 增量失败同样在锁内落盘失败标记；下一次同步先做全量对账，
                # 避免跳过未成功导入的提交。
                self.hash_manager.mark_failed()
                raise

    async def _sync_incremental_locked(
        self,
        default_user: User | None = None,
        old_hash: str | None = None,
        new_hash: str | None = None,
    ) -> SyncStats:
        # Local worktree edits are not represented by commit ranges. Always scan
        # the current files, and do not consume the remote-import cursor.
        if not settings.GIT_PULL_BEFORE_SYNC:
            return await self._sync_all_locked(default_user)
        # Recheck after waiting: another worker may have failed meanwhile.
        if self.hash_manager.needs_full_sync():
            return await self._sync_all_locked(default_user)
        start_time = time.time()
        # 1. 先 Git Pull (把远程变更拉下来)
        await self.github.pull()

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
        else:
            # 始终从上次成功导入的游标开始，避免失败后再次 pull 跳过变更。
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
            stats.duration = time.time() - start_time
            return stats

        logger.info("Starting incremental sync...")

        # 6. 处理变更文件 (Disk -> DB 阶段)
        target_paths = [
            path
            for _, path in changed_files
            if is_content_path(path)
        ]

        if not target_paths:
            # Documentation/notes do not need a user lookup, database writes,
            # frontmatter processing or cache invalidation.
            await self.hash_manager.save_current_hash()
            stats.duration = time.time() - start_time
            return stats

        await self.container.validate_content()
        operating_user = await self._get_operating_user(default_user)

        if target_paths:
            # 读取全量 source_path 后统一归一化，才能兼容历史绝对路径，
            # 并避免旧记录被当成孤儿删除。
            existing_posts = await post_crud.get_posts_with_source_path(
                self.session
            )
            existing_map = {
                normalize_source_path(p.source_path, self.content_dir): p
                for p in existing_posts
                if p.source_path
            }
        else:
            existing_map = {}

        # 7. 执行增量对齐
        await self.sync_processor.reconcile_incremental_sync(
            self.session, changed_files, existing_map, operating_user, stats
        )

        await self.session.commit()

        if stats.added or stats.updated or stats.deleted:
            await revalidate_nextjs_cache(
                settings.FRONTEND_URL, settings.REVALIDATE_SECRET
            )

        # 即便只有图片或其他非文章文件变化，也推进成功导入的游标。
        if stats.errors:
            self.hash_manager.mark_failed()
        else:
            self.hash_manager.clear_failed()
            await self.hash_manager.save_current_hash()
        stats.duration = time.time() - start_time

        logger.info(
            f"Incremental sync completed: "
            f"+{len(stats.added)} ~{len(stats.updated)} -{len(stats.deleted)}"
        )

        return stats
