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
from app.git_ops.components.handlers.category_sync import handle_category_sync
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

                # 检查是否有新提交
                if current_hash == last_hash:
                    logger.info("No new commits detected.")
                    # 即使没有新提交，也检查是否有未同步的文件
                    # 这可以处理数据库被清空或之前同步失败的情况
                    unsynced_count = await self._check_unsynced_files()
                    if unsynced_count == 0:
                        logger.info("All files are in sync. No action needed.")
                        return SyncStats()
                    else:
                        logger.info(
                            f"Found {unsynced_count} unsynced files. Falling back to full sync."
                        )
                        stats = await self._sync_all_impl(default_user)
                        await self._save_last_hash(current_hash)
                        return stats

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
            operating_user = await self._get_operating_user(default_user)
            stats = await self._process_changed_files(changed_files, default_user)

            # 5. 检查并清理孤儿记录（数据库中有但文件系统中没有的记录）
            await self._cleanup_orphaned_posts(stats, operating_user)

            # 6. 更新 Hash
            await self._save_last_hash(current_hash)

            # 7. 为数据库中的分类写入 index.md（如果缺失）
            await self._write_category_indexes(stats)

            # 8. 如果有回写的元数据，提交并推送到 GitHub
            await self._commit_metadata_changes(stats)

            # 9. 刷新缓存
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
        self.processed_post_ids = set()  # 改为实例变量，供 _cleanup_orphaned_posts 使用

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

                # 情况 C: 分类元数据同步 (index.md)
                if scanned.is_category_index:
                    await handle_category_sync(
                        self.session,
                        scanned,
                        operating_user,
                        self.content_dir,
                    )
                    stats.updated.append(file_rel_path)
                    continue

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
                        self.processed_post_ids,
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
                        self.processed_post_ids,
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

    async def _check_unsynced_files(self) -> int:
        """检查是否有未同步的文件

        Returns:
            未同步的文件数量
        """
        # 扫描文件系统中的所有 MDX/MD 文件
        scanned_posts = await self.scanner.scan_all()
        scanned_paths = {p.file_path for p in scanned_posts if not p.is_category_index}

        # 获取数据库中的所有文章路径
        existing_posts = await post_crud.get_posts_with_source_path(self.session)
        db_paths = {p.source_path for p in existing_posts}

        # 计算差异：文件系统中有但数据库中没有的文件
        unsynced = scanned_paths - db_paths

        return len(unsynced)

    async def _cleanup_orphaned_posts(self, stats: SyncStats, operating_user: User):
        """清理孤儿记录（数据库中有但文件系统中没有的记录）

        这个方法在增量同步时调用，确保数据库和文件系统保持一致
        """
        # 获取所有数据库中的文章
        existing_posts = await post_crud.get_posts_with_source_path(self.session)

        # 检查每个数据库记录对应的文件是否存在
        for post in existing_posts:
            # 跳过已经处理过的文章
            if post.id in self.processed_post_ids:
                continue

            # 检查文件是否存在
            file_path = self.content_dir / post.source_path
            if not file_path.exists():
                async with collect_errors(
                    stats, f"Cleaning up orphaned post {post.source_path}"
                ):
                    logger.info(
                        f"Deleting orphaned post: {post.source_path} (slug={post.slug})"
                    )
                    await post_service.delete_post(
                        self.session, post.id, current_user=operating_user
                    )
                    stats.deleted.append(post.source_path)

    async def _commit_metadata_changes(self, stats: SyncStats):
        """提交元数据变更到 GitHub

        在同步完成后，如果有文件被添加或更新（意味着可能有元数据回写），
        则自动提交并推送这些变更到 GitHub
        """
        # 只有在有添加或更新的文件时才提交
        if not stats.added and not stats.updated:
            logger.info("No metadata changes to commit.")
            return

        try:
            from .commit_service import CommitService

            # 创建 CommitService 实例 - 使用 container 而不是单独的参数
            commit_service = CommitService(
                session=self.session,
                container=self.container,
            )

            # 构建提交信息
            added_count = len(stats.added)
            updated_count = len(stats.updated)
            parts = []
            if added_count > 0:
                parts.append(f"+{added_count}")
            if updated_count > 0:
                parts.append(f"~{updated_count}")

            message = f"chore: sync metadata from database ({' '.join(parts)})"

            # 执行自动提交
            logger.info(f"Committing metadata changes: {message}")
            await commit_service.auto_commit(message)
            logger.info("Metadata changes committed and pushed successfully.")
        except Exception as e:
            # 不要让提交失败影响同步流程
            logger.warning(f"Failed to commit metadata changes: {e}", exc_info=True)

    async def _write_category_indexes(self, stats: SyncStats):
        """为数据库中的分类写入 index.md 文件

        检查所有数据库中的分类，如果没有对应的 index.md 文件，则创建它
        """
        from app.posts.model import Category
        from sqlalchemy.orm import selectinload
        from sqlmodel import select

        try:
            # 查询所有分类（预加载 cover_media）
            stmt = select(Category).options(
                selectinload(Category.cover_media),  # type: ignore
            )
            result = await self.session.execute(stmt)
            categories = result.scalars().all()

            if not categories:
                logger.info("No categories found in database.")
                return

            logger.info(f"Checking {len(categories)} categories for index.md files...")

            from app.git_ops.components.writer.writer import FileWriter

            writer = FileWriter(session=self.session, content_dir=self.content_dir)
            created_count = 0

            for category in categories:
                # 计算 index.md 的路径
                from app.git_ops.components.writer.path_calculator import (
                    POST_TYPE_DIR_MAP,
                )

                raw_type = category.post_type.value
                type_folder = POST_TYPE_DIR_MAP.get(raw_type, raw_type)
                index_path = self.content_dir / type_folder / category.slug / "index.md"

                # 如果 index.md 不存在，创建它
                if not index_path.exists():
                    logger.info(
                        f"Creating missing index.md for category: {category.slug}"
                    )
                    try:
                        await writer.write_category(category)
                        # 计算相对路径
                        rel_path = f"{type_folder}/{category.slug}/index.md"
                        stats.added.append(rel_path)
                        created_count += 1
                    except Exception as e:
                        logger.error(
                            f"Failed to create index.md for {category.slug}: {e}"
                        )

            if created_count > 0:
                logger.info(f"Created {created_count} missing index.md files.")
            else:
                logger.info("All categories have index.md files.")

        except Exception as e:
            logger.error(f"Failed to write category indexes: {e}", exc_info=True)

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
                # 分类元数据同步 (index.md)
                if scanned.is_category_index:
                    await handle_category_sync(
                        self.session,
                        scanned,
                        operating_user,
                        self.content_dir,
                    )
                    stats.updated.append(file_path)
                    continue

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

        # 5. 为数据库中的分类写入 index.md（如果缺失）
        await self._write_category_indexes(stats)

        # 6. 如果有回写的元数据，提交并推送到 GitHub
        await self._commit_metadata_changes(stats)

        # 7. 刷新缓存 (Best effort)
        if stats.added or stats.updated or stats.deleted:
            await revalidate_nextjs_cache(
                settings.FRONTEND_URL, settings.REVALIDATE_SECRET
            )

        return stats
