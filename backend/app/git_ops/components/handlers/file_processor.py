"""
文件处理器 - 统一处理文件的新增、更新、删除逻辑
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict

from app.git_ops.components.handlers.category_sync import handle_category_sync
from app.git_ops.components.handlers.post_create import handle_post_create
from app.git_ops.components.handlers.post_update import handle_post_update
from app.git_ops.components.path_utils import is_same_path, normalize_source_path
from app.git_ops.components.scanner import MDXScanner
from app.git_ops.components.serializer import PostSerializer
from app.git_ops.components.scanner.policy import is_content_path
from app.git_ops.exceptions import GitOpsSyncError
from app.git_ops.schema import SyncError, SyncStats
from app.posts import cruds as post_crud
from app.posts import services as post_service
from app.posts.model import Post
from app.users.model import User
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


class SyncProcessor:
    """同步处理器 - 负责具体的同步逻辑"""

    def __init__(
        self,
        scanner: MDXScanner,
        serializer: PostSerializer,
        content_dir: Path,
    ):
        self.scanner = scanner
        self.serializer = serializer
        self.content_dir = content_dir

    def _validate_move(self, post: Post, new_path: str):
        """A matching slug alone cannot transfer ownership of a database row."""
        old_path = post.source_path
        if not isinstance(old_path, str) or not old_path:
            raise GitOpsSyncError(
                f"Slug '{post.slug}' conflicts with a database-only post: {new_path}"
            )
        old_path = normalize_source_path(old_path, self.content_dir)
        if Path(old_path).is_absolute():
            raise GitOpsSyncError(
                f"Slug '{post.slug}' points outside the content repository: {old_path}"
            )
        if not is_same_path(old_path, new_path) and (
            self.content_dir / old_path
        ).exists():
            raise GitOpsSyncError(
                f"Slug '{post.slug}' is used by both {old_path} and {new_path}; "
                "the original source still exists."
            )

    async def resolve_internal_links_for_posts(
        self, session: AsyncSession, post_ids: set
    ):
        """
        后处理：对指定的一组文章重新进行链接解析
        这是为了解决 "A引用B，但A先处理导致链接无法解析" 的问题
        """
        if not post_ids:
            return

        from app.git_ops.components.processors.content import ContentProcessor
        from app.posts.model import Post
        from sqlmodel import select

        logger.info(
            f"🔄 Resolving internal links for {len(post_ids)} processed posts..."
        )

        # 1. 批量获取文章
        stmt = select(Post).where(Post.id.in_(post_ids))
        result = await session.execute(stmt)
        posts = result.scalars().all()

        processor = ContentProcessor()

        count = 0
        for post in posts:
            if not post.source_path or not post.content_mdx:
                continue

            try:
                # 2. 尝试解析链接
                # 注意：_transform_internal_links 是为了处理磁盘文件上的链接转换
                # 只更新数据库中的展示内容，保留 Git 源文件。
                original_content = post.content_mdx
                new_content = await processor._transform_internal_links(
                    original_content, post.source_path, session
                )

                if new_content != original_content:
                    logger.info(f"🔗 Fixed links in post: {post.source_path}")
                    # 更新 DB
                    post.content_mdx = new_content
                    session.add(post)

                    count += 1
            except Exception as e:
                logger.warning(f"⚠️ Failed to resolve links for {post.source_path}: {e}")

        if count > 0:
            logger.info(f"✅ Fixed links for {count} posts.")
            # 这里的 session 提交通常由外部（调用者）负责，或者显式 commit
            # 由于这是后处理，最好先 commit 一次确保安全
            await session.commit()

    @asynccontextmanager
    async def _file_savepoint(self, session, stats, processed_post_ids, context):
        """只合并成功释放 savepoint 的文件统计，异常交给外层收集。"""
        from app.git_ops.exceptions import collect_errors

        async with collect_errors(stats, context):
            file_stats = SyncStats()
            file_post_ids = set()
            async with session.begin_nested():
                yield file_stats, file_post_ids
            stats.added.extend(file_stats.added)
            stats.updated.extend(file_stats.updated)
            stats.deleted.extend(file_stats.deleted)
            stats.errors.extend(file_stats.errors)
            processed_post_ids.update(file_post_ids)

    async def process_file_change(
        self,
        session: AsyncSession,
        file_path: str,
        status: str,  # "A" (added), "M" (modified), "D" (deleted)
        existing_map: Dict[str, Post],
        operating_user: User,
        stats: SyncStats,
        processed_post_ids: set,
        old_path: str | None = None,
        pending_moves: set | None = None,
    ):
        """
        统一处理文件变更（新增、修改、删除）

        Args:
            session: 数据库会话
            file_path: 文件路径
            status: 变更状态 ("A", "M", "D")
            existing_map: 现有文章映射 {source_path: Post}
            operating_user: 操作用户
            stats: 统计信息
            processed_post_ids: 已处理的文章 ID 集合
        """

        if not is_content_path(file_path):
            return

        # 删除文件
        if status == "D":
            post = existing_map.get(file_path)
            if post:
                logger.info(f"🗑️  Deleting post: {file_path}")
                await post_service.delete_post(
                    session, post.id, current_user=operating_user
                )
                stats.deleted.append(str(file_path))
            else:
                logger.warning(
                    f"⚠️  File marked as deleted but not found in DB: {file_path}"
                )
            return

        # 新增或修改文件
        if status in ("A", "M"):
            # 扫描文件
            scanned = await self.scanner.scan_file(file_path)

            # 处理分类 index
            if scanned.is_category_index:
                logger.info(f"🔄 Processing category index: {scanned.file_path}")
                category = await handle_category_sync(
                    session,
                    scanned,
                    operating_user,
                    self.content_dir,
                )
                if category:
                    logger.info(
                        f"✅ Category synced: {category.name} (slug={category.slug})"
                    )
                stats.updated.append(str(scanned.file_path))
                return

            # 处理文章：判断是新增还是更新
            if file_path not in existing_map:
                # 移动/改名：如果 frontmatter 有显式 slug，尝试复用旧记录，
                # 保留数据库 ID、浏览量和互动数据。
                fm_slug = scanned.frontmatter.get("slug")
                if fm_slug:
                    moved_post = await post_crud.get_post_by_slug(
                        session, str(fm_slug)
                    )
                    if moved_post:
                        self._validate_move(moved_post, file_path)
                        logger.info(
                            f"🔀 Reusing post {moved_post.id} by slug '{fm_slug}' "
                            f"for new path: {file_path}"
                        )
                        await handle_post_update(
                            session,
                            moved_post,
                            scanned,
                            Path(file_path),
                            True,
                            self.serializer,
                            operating_user,
                            self.content_dir,
                            stats,
                            processed_post_ids,
                        )
                        return

                # 新增文章
                logger.info(f"➕ Creating new post: {file_path}")
                await handle_post_create(
                    session,
                    scanned,
                    file_path,
                    self.serializer,
                    operating_user,
                    self.content_dir,
                    stats,
                    processed_post_ids,
                )
            else:
                # 更新已有文章
                post = existing_map[file_path]
                logger.info(f"📝 Updating existing post: {file_path}")
                await handle_post_update(
                    session,
                    post,
                    scanned,
                    Path(file_path) if isinstance(file_path, str) else file_path,
                    False,  # is_move
                    self.serializer,
                    operating_user,
                    self.content_dir,
                    stats,
                    processed_post_ids,
                )
            return

        # 未知状态不能静默跳过，否则游标推进后该文件永远不会被导入。
        message = f"Unknown Git file status '{status}' for: {file_path}"
        logger.warning(f"⚠️  {message}")
        stats.errors.append(
            SyncError(
                context=f"Processing {status} {file_path}",
                code="UNKNOWN_GIT_STATUS",
                message=message,
            )
        )

    async def process_scanned_file(
        self,
        session: AsyncSession,
        file_path: str,
        scanned,
        existing_map: Dict[str, Post],
        operating_user: User,
        stats: SyncStats,
        processed_post_ids: set,
    ):
        """
        处理已扫描的文件（用于全量同步）

        Args:
            session: 数据库会话
            file_path: 文件路径
            scanned: 扫描结果
            existing_map: 现有文章映射 {source_path: Post}
            operating_user: 操作用户
            stats: 统计信息
            processed_post_ids: 已处理的文章 ID 集合
        """

        # 处理分类 index
        if scanned.is_category_index:
            logger.info(f"🔄 Processing category index: {scanned.file_path}")
            category = await handle_category_sync(
                session,
                scanned,
                operating_user,
                self.content_dir,
            )
            if category:
                logger.info(
                    f"✅ Category synced: {category.name} (slug={category.slug})"
                )
            stats.updated.append(str(scanned.file_path))
            return

        # 处理文章：显式判断是新增还是更新
        if file_path not in existing_map:
            fm_slug = scanned.frontmatter.get("slug")
            if fm_slug:
                reused_post = await post_crud.get_post_by_slug(
                    session, str(fm_slug)
                )
                if reused_post:
                    self._validate_move(reused_post, file_path)
                    logger.info(
                        f"🔀 Reusing post {reused_post.id} by slug '{fm_slug}' "
                        f"for new path: {file_path}"
                    )
                    await handle_post_update(
                        session,
                        reused_post,
                        scanned,
                        Path(file_path),
                        True,
                        self.serializer,
                        operating_user,
                        self.content_dir,
                        stats,
                        processed_post_ids,
                    )
                    return

            # 新增文章
            logger.info(f"➕ Creating new post: {file_path}")
            await handle_post_create(
                session,
                scanned,
                file_path,
                self.serializer,
                operating_user,
                self.content_dir,
                stats,
                processed_post_ids,
            )
        else:
            # 更新已有文章
            post = existing_map[file_path]
            logger.info(f"📝 Updating existing post: {file_path}")
            await handle_post_update(
                session,
                post,
                scanned,
                Path(file_path) if isinstance(file_path, str) else file_path,
                False,  # is_move
                self.serializer,
                operating_user,
                self.content_dir,
                stats,
                processed_post_ids,
            )

    async def reconcile_full_sync(
        self,
        session: AsyncSession,
        scanned_map: Dict[str, Any],
        existing_map: Dict[str, Post],
        operating_user: User,
        stats: SyncStats,
    ):
        """
        全量同步的核心协调逻辑：
        1. 对比找出孤儿记录并删除 (DB - Disk)
        2. 遍历处理所有磁盘文件 (Disk -> DB)

        Args:
            session: 数据库会话
            scanned_map: 磁盘文件映射 {path: ScannedPost}
            existing_map: 数据库现有记录映射 {path: Post}
            operating_user: 操作用户
            stats: 统计对象
        """

        # 1. 删除数据库中多余的记录（文件系统中不存在的）
        # 如果本轮扫描有文件解析失败，不能把它当成“文件已删除”，否则会误删
        # 数据库记录且游标不会推进，造成内容丢失。
        # 先按显式 slug 识别移动/改名，避免把旧记录当孤儿删除后丢失 ID 和互动数据。
        reused_post_ids = set()
        for file_path, scanned in scanned_map.items():
            if file_path in existing_map or scanned.is_category_index:
                continue
            fm_slug = scanned.frontmatter.get("slug")
            if not fm_slug:
                continue
            try:
                reused_post = await post_crud.get_post_by_slug(
                    session, str(fm_slug)
                )
            except Exception as exc:
                logger.warning(
                    "Failed to match moved post by slug %s: %s", fm_slug, exc
                )
                continue
            if reused_post:
                reused_post_ids.add(reused_post.id)

        processed_post_ids = set()
        scan_errors = getattr(self.scanner, "last_scan_errors", {})
        scan_incomplete = getattr(self.scanner, "last_scan_incomplete", False)
        if scan_errors or scan_incomplete:
            logger.warning(
                "Skipping orphan cleanup because the scan was incomplete "
                "(errors=%d, incomplete=%s); the import cursor will not advance.",
                len(scan_errors),
                scan_incomplete,
            )
        else:
            for db_path, post in existing_map.items():
                if db_path not in scanned_map and post.id not in reused_post_ids:
                    async with self._file_savepoint(
                        session,
                        stats,
                        processed_post_ids,
                        f"Deleting orphaned {db_path}",
                    ) as (file_stats, _):
                        logger.info(
                            f"Deleting orphaned post: {db_path} (slug={post.slug})"
                        )
                        await post_service.delete_post(
                            session, post.id, current_user=operating_user
                        )
                        file_stats.deleted.append(str(db_path).replace("\\", "/"))

        # 2. 处理扫描到的文件 (Disk -> DB)
        # Article paths must be current before category descriptions resolve
        # their relative links, especially after a directory rename.
        for file_path, scanned in sorted(
            scanned_map.items(), key=lambda item: (bool(item[1].is_category_index), item[0])
        ):
            async with self._file_savepoint(
                session, stats, processed_post_ids, f"Processing {file_path}"
            ) as (file_stats, file_post_ids):
                await self.process_scanned_file(
                    session,
                    file_path,
                    scanned,
                    existing_map,
                    operating_user,
                    file_stats,
                    file_post_ids,
                )

        # 3. 🆕 后处理：批量修复内部链接
        # 因为在第一遍扫描时，目标文章可能还未入库，导致 ContentProcessor 无法解析链接
        # 所以需要在这个时候（所有文章都在 DB 后）再次尝试解析所有被 update/add 的文章
        if processed_post_ids:
            # 获取这批文章的路径映射（只有发生过变更的才需要重试）
            # 注意：这里我们重新查询 DB 确保状态最新
            await self.resolve_internal_links_for_posts(session, processed_post_ids)

    async def reconcile_incremental_sync(
        self,
        session: AsyncSession,
        changed_files: list,
        existing_map: Dict[str, Post],
        operating_user: User,
        stats: SyncStats,
    ):
        """
        增量同步的核心协调逻辑：
        遍历变更列表并调度处理

        Args:
            session: 数据库会话
            changed_files: 变更文件列表 [(status, path), ...]
            existing_map: 涉及到的数据库现有记录映射
            operating_user: 操作用户
            stats: 统计对象
        """

        processed_post_ids = set()

        if changed_files:
            logger.info(
                f"Incremental sync: processing {len(changed_files)} changed files."
            )

            # 预扫描显式 slug 的移动/改名。重命名在 --no-renames 下会表现为
            # 删除 + 新增；先识别要复用的旧记录，删除阶段跳过它，保留 ID 和互动数据。
            # 任一新文件预扫描失败时，本轮不允许删除旧记录，避免目标解析失败
            # 导致旧文章在重试前已经丢失。
            moved_post_ids = set()
            pre_scan_failed = False
            for status, file_path in changed_files:
                if status not in ("A", "M"):
                    continue
                if not is_content_path(file_path):
                    continue
                if any(
                    part.startswith(".") for part in Path(file_path).parts
                ):
                    continue
                if file_path in existing_map:
                    continue
                try:
                    scanned = await self.scanner.scan_file(file_path)
                    if not scanned or scanned.is_category_index:
                        continue
                    fm_slug = scanned.frontmatter.get("slug")
                    if not fm_slug:
                        continue
                    old_post = await post_crud.get_post_by_slug(
                        session, str(fm_slug)
                    )
                except Exception as exc:
                    pre_scan_failed = True
                    logger.warning(
                        "Pre-scan failed for %s; deletions will be skipped: %s",
                        file_path,
                        exc,
                    )
                    continue
                if old_post:
                    moved_post_ids.add(old_post.id)

            # 先处理删除，再处理新增/修改。显式 slug 的移动会在删除阶段跳过，
            # 随后按 slug 复用旧记录；无 slug 的移动仍然是删除 + 新建。
            ordered_changes = sorted(
                changed_files,
                key=lambda item: (
                    0 if item[0] == "D" else 1,
                    Path(item[1]).name.lower() == "index.md",
                    item[1],
                ),
            )
            for status, file_path in ordered_changes:
                # 与 scan_all 保持一致：隐藏路径不参与增量导入。
                if any(
                    part.startswith(".") for part in Path(file_path).parts
                ):
                    logger.debug(
                        f"🙈 Skipping hidden file in incremental sync: {file_path}"
                    )
                    continue

                if status == "D":
                    if pre_scan_failed:
                        logger.warning(
                            "Skipping deletion of %s because an added/modified "
                            "file failed pre-scan.",
                            file_path,
                        )
                        continue
                    old_post = existing_map.get(file_path)
                    if old_post and old_post.id in moved_post_ids:
                        logger.info(
                            f"🔀 Keeping post {old_post.id} for moved file: "
                            f"{file_path} -> new path"
                        )
                        continue

                if not is_content_path(file_path):
                    continue

                async with self._file_savepoint(
                    session, stats, processed_post_ids, f"Processing {status} {file_path}"
                ) as (file_stats, file_post_ids):
                    await self.process_file_change(
                        session,
                        file_path,
                        status,
                        existing_map,
                        operating_user,
                        file_stats,
                        file_post_ids,
                        old_path=None,
                        pending_moves=set(),
                    )
