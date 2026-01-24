"""
同步服务 - 负责全量和增量同步
"""

import asyncio
import logging
import time
from pathlib import Path

from app.core.config import settings
from app.git_ops.components import (
    handle_post_create,
    handle_post_update,
    revalidate_nextjs_cache,
)
from app.git_ops.exceptions import GitError, collect_errors
from app.git_ops.schema import SyncStats
from app.posts import cruds as post_crud
from app.posts import services as post_service
from app.users.model import User

from .base import BaseGitOpsService

logger = logging.getLogger(__name__)

LAST_SYNC_FILE = ".gitops_last_sync"


class SyncService(BaseGitOpsService):
    """同步服务 - 负责全量和增量同步"""

    _sync_lock: asyncio.Lock = None

    @property
    def sync_lock(self) -> asyncio.Lock:
        if SyncService._sync_lock is None:
            SyncService._sync_lock = asyncio.Lock()
        return SyncService._sync_lock

    async def sync_all(self, default_user: User = None) -> SyncStats:
        """执行全量同步（扫描本地文件 -> 更新数据库）"""
        if self.sync_lock.locked():
            logger.warning("GitOps sync is already in progress, waiting for lock...")

        async with self.sync_lock:
            # 更新全量 sync 后，也要更新 hash，保证下次增量正常
            stats = await self._sync_all_impl(default_user)
            current_hash = await self.git_client.get_current_hash()
            await self._save_last_hash(current_hash)
            return stats

    async def sync_incremental(self, default_user: User = None) -> SyncStats:
        """执行增量同步（基于 Git Diff）"""
        if self.sync_lock.locked():
            logger.warning("GitOps sync is already in progress, waiting for lock...")

        async with self.sync_lock:
            # 1. 尝试获取上次同步的 Hash
            last_hash = await self._load_last_hash()

            # 如果没有记录，回退到全量同步
            if not last_hash:
                logger.info("No last sync record found. Falling back to full sync.")
                stats = await self._sync_all_impl(default_user)

                # 保存当前 hash
                current_hash = await self.git_client.get_current_hash()
                await self._save_last_hash(current_hash)
                return stats

            # 2. 执行 Git Pull
            # 使用 collect_errors 捕获错误，确保 pull 失败不影响后续操作
            if (self.content_dir / ".git").exists():
                stats = SyncStats()  # Initialize stats before using it
                async with collect_errors(stats, "Git Pull"):
                    logger.info("Attempting git pull...")
                    await self.git_client.pull()

            # 3. 获取差异文件
            try:
                current_hash = await self.git_client.get_current_hash()
                if current_hash == last_hash:
                    logger.info("No new commits. Sync is up to date.")
                    return SyncStats()

                changed_files = await self.git_client.get_changed_files(last_hash)
            except GitError as e:
                logger.warning(
                    f"Failed to calculate incremental diff: {e}. Falling back to full sync."
                )
                stats = await self._sync_all_impl(default_user)
                current_hash = await self.git_client.get_current_hash()
                await self._save_last_hash(current_hash)
                return stats

            logger.info(f"Incremental Sync: found {len(changed_files)} changed files.")

            # 4. 只处理变更的文件
            stats = await self._process_changed_files(changed_files, default_user)

            # 5. 更新 Hash
            await self._save_last_hash(current_hash)

            # 6. 刷新缓存
            if stats.added or stats.updated or stats.deleted:
                await revalidate_nextjs_cache(
                    settings.FRONTEND_URL, settings.REVALIDATE_SECRET
                )

            return stats

    async def _process_changed_files(
        self, files: list[str], default_user: User
    ) -> SyncStats:
        """处理文件变更列表"""
        stats = SyncStats()
        operating_user = await self._get_operating_user(default_user)
        processed_post_ids = set()

        # 预加载 DB 数据
        existing_posts = await post_crud.get_posts_with_source_path(self.session)

        for file_rel_path in files:
            # 忽略非 MDX/MD 文件的变更
            if not file_rel_path.endswith((".md", ".mdx")):
                continue

            file_path = self.content_dir / file_rel_path

            async with collect_errors(stats, f"Syncing {file_rel_path}"):
                # 情况 A: 文件被删除
                if not file_path.exists():
                    # 查找对应的 Post（使用相对路径匹配）
                    post_to_delete = next(
                        (p for p in existing_posts if p.source_path == file_rel_path),
                        None,
                    )
                    if post_to_delete:
                        logger.info(f"Deleting post: {post_to_delete.source_path}")
                        await post_service.delete_post(
                            self.session, post_to_delete.id, current_user=operating_user
                        )
                        stats.deleted.append(file_rel_path)
                    continue

                # 情况 B: 文件新增或修改
                scanned = await self.scanner.scan_file(file_rel_path)
                matched_post, is_move = await self.serializer.match_post(
                    scanned, existing_posts
                )

                if matched_post:
                    await handle_post_update(
                        self.session,
                        matched_post,
                        scanned,
                        file_path,  # 绝对路径 Path 对象
                        is_move,
                        self.serializer,
                        operating_user,
                        self.content_dir,
                        stats,
                        processed_post_ids,
                    )
                else:
                    await handle_post_create(
                        self.session,
                        scanned,
                        file_rel_path,  # 相对路径字符串
                        self.serializer,
                        operating_user,
                        self.content_dir,
                        stats,
                        processed_post_ids,
                    )

        return stats

    async def _load_last_hash(self) -> str | None:
        """加载上次同步的 Commit Hash"""
        hash_file = self.content_dir / LAST_SYNC_FILE
        if hash_file.exists():
            return hash_file.read_text().strip()
        return None

    async def _save_last_hash(self, commit_hash: str):
        """保存当前同步的 Commit Hash"""
        if not commit_hash:
            return
        hash_file = self.content_dir / LAST_SYNC_FILE
        hash_file.write_text(commit_hash)

    async def _sync_all_impl(self, default_user: User = None) -> SyncStats:
        """内部同步实现"""
        start_time = time.time()
        stats = SyncStats()

        logger.info("Starting GitOps sync...")

        # 0. 确定操作用户
        operating_user = await self._get_operating_user(default_user)

        # 0.5 Git Pull (Best effort)
        if (self.content_dir / ".git").exists():
            async with collect_errors(stats, "Git Pull"):
                logger.info("Attempting git pull...")
                pull_output = await self.git_client.pull()
                logger.info(f"Git pull result: {pull_output}")
        else:
            logger.info("Skip git pull: repository not initialized.")

        # 1. 扫描文件系统
        scanned_posts = await self.scanner.scan_all()
        scanned_map = {p.file_path: p for p in scanned_posts}
        logger.info(f"Scanned {len(scanned_posts)} files.")

        # 2. 获取数据库现状
        existing_posts = await post_crud.get_posts_with_source_path(self.session)

        # 记录本次处理过的 Post ID
        processed_post_ids = set()

        # 3. 处理每个文件
        for file_path, scanned in scanned_map.items():
            async with collect_errors(stats, f"Syncing {file_path}"):
                matched_post, is_move = await self.serializer.match_post(
                    scanned, existing_posts
                )

                if matched_post:
                    # 如果已经存在，则是更新的逻辑
                    await handle_post_update(
                        self.session,
                        matched_post,
                        scanned,
                        Path(file_path),
                        is_move,
                        self.serializer,
                        operating_user,
                        self.content_dir,
                        stats,
                        processed_post_ids,
                    )
                else:
                    await handle_post_create(
                        self.session,
                        scanned,
                        file_path,
                        self.serializer,
                        operating_user,
                        self.content_dir,
                        stats,
                        processed_post_ids,
                    )

        # 4. 处理删除
        for post in existing_posts:
            if post.id not in processed_post_ids:
                async with collect_errors(stats, f"Deleting {post.source_path}"):
                    logger.info(f"Deleting post: {post.source_path} (slug={post.slug})")
                    await post_service.delete_post(
                        self.session, post.id, current_user=operating_user
                    )
                    stats.deleted.append(post.source_path)

        stats.duration = time.time() - start_time
        logger.info(
            f"Sync completed in {stats.duration:.2f}s: +{len(stats.added)} ~{len(stats.updated)} -{len(stats.deleted)}"
        )

        # 5. 刷新缓存 (Best effort)
        if stats.added or stats.updated or stats.deleted:
            await revalidate_nextjs_cache(
                settings.FRONTEND_URL, settings.REVALIDATE_SECRET
            )

        return stats
