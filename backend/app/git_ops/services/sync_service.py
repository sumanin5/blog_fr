"""
同步服务 - 负责全量和增量同步
"""

import asyncio
import logging
import time
from pathlib import Path

from app.core.config import settings
from app.git_ops.components import (
    revalidate_nextjs_cache,
)
from app.git_ops.exceptions import GitOpsConfigurationError
from app.git_ops.schema import SyncError, SyncStats
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
                p.source_path.replace("\\", "/"): p
                for p in existing_posts
                if p.source_path
            }

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
                    ignore_names = {
                        "README.MD",
                        "README.MDX",
                        "AGENTS.MD",
                        "CLAUDE.MD",
                        "LICENSE.MD",
                        "CONTRIBUTING.MD",
                        "CHANGELOG.MD",
                        ".GITIGNORE",
                    }
                    expected_paths = {
                        path
                        for path in tracked_files
                        if not any(
                            part.startswith(".") for part in Path(path).parts
                        )
                        and Path(path).name.upper() not in ignore_names
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
                self.scanner.last_scan_incomplete = True
                stats.errors.append(
                    SyncError(
                        context="Full sync safety check",
                        code="SCAN_INCOMPLETE",
                        message=(
                            "扫描结果为空但数据库仍有 Git 来源文章，"
                            "已跳过孤儿删除；请检查 CONTENT_DIR 和仓库挂载。"
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
        if self.hash_manager.needs_full_sync():
            logger.warning(
                "Previous sync failed; running a full reconciliation before "
                "continuing incremental imports."
            )
            return await self.sync_all(default_user)

        sync_lock = self._get_sync_lock()

        if sync_lock.locked():
            logger.warning("GitOps sync is already in progress, waiting for lock...")

        async with sync_lock:
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
                existing_map = {
                    p.source_path.replace("\\", "/"): p
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
