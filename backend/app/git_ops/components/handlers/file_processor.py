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
from app.git_ops.components.scanner import MDXScanner, is_content_file
from app.git_ops.components.serializer import PostSerializer
from app.git_ops.schema import SyncStats
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

    async def resolve_internal_links_for_posts(
        self, session: AsyncSession, post_ids: set, stats: SyncStats
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

            async with self._file_savepoint(
                session, stats, set(), f"Resolving links for {post.source_path}"
            ):
                # 2. 尝试解析链接
                # 注意：_transform_internal_links 是为了处理磁盘文件上的链接转换
                # 这里我们直接对 DB 中的 content_mdx 进行转换，如果有变动，则更新 DB 和 磁盘
                original_content = post.content_mdx
                new_content = await processor._transform_internal_links(
                    original_content, post.source_path, session
                )

                if new_content != original_content:
                    logger.info(f"🔗 Fixed links in post: {post.source_path}")
                    # 更新 DB
                    post.content_mdx = new_content
                    session.add(post)

                    # 更新磁盘 (物理文件)
                    await processor._write_transformed_content(
                        post.source_path, new_content
                    )
                    count += 1

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
        status: str,  # A/M/D/R
        existing_map: Dict[str, Post],
        operating_user: User,
        stats: SyncStats,
        processed_post_ids: set,
        old_path: str | None = None,
        pending_moves: set[str] | None = None,
    ):
        """
        统一处理文件变更（新增、修改、删除）

        Args:
            session: 数据库会话
            file_path: 文件路径
            status: 变更状态 ("A", "M", "D", "R")
            existing_map: 现有文章映射 {source_path: Post}
            operating_user: 操作用户
            stats: 统计信息
            processed_post_ids: 已处理的文章 ID 集合
        """

        # 删除文件
        if status == "D":
            if pending_moves is not None and file_path in pending_moves:
                return
            posts = await post_crud.get_posts_by_source_paths(session, [file_path])
            post = posts[0] if posts else None
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
        if status in ("A", "M", "R"):
            # 扫描文件
            scanned = await self.scanner.scan_file(file_path)

            await self.process_scanned_file(
                session,
                file_path,
                scanned,
                existing_map,
                operating_user,
                stats,
                processed_post_ids,
                old_path=old_path,
                pending_moves=pending_moves,
            )
            return

        # 未知状态
        logger.warning(f"⚠️  Unknown file status '{status}' for: {file_path}")

    async def process_scanned_file(
        self,
        session: AsyncSession,
        file_path: str,
        scanned,
        existing_map: Dict[str, Post],
        operating_user: User,
        stats: SyncStats,
        processed_post_ids: set,
        old_path: str | None = None,
        pending_moves: set[str] | None = None,
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

        # 路径优先；重命名使用旧路径，未识别为 R 的移动以系统回写的 slug 兜底。
        post = existing_map.get(file_path) or existing_map.get(old_path)
        if post is None and scanned.frontmatter.get("slug"):
            candidate = await post_crud.get_post_by_slug(
                session, scanned.frontmatter["slug"]
            )
            if (
                candidate is not None
                and candidate.source_path
                and not (self.content_dir / candidate.source_path).exists()
            ):
                post = candidate

        if (
            post is not None
            and post.source_path != file_path
            and pending_moves is not None
        ):
            # 在更新前记录：即使移动失败，也不能随后把旧记录当作删除处理。
            pending_moves.add(post.source_path)

        if post is None:
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
            logger.info(f"📝 Updating existing post: {file_path}")
            await handle_post_update(
                session,
                post,
                scanned,
                Path(file_path) if isinstance(file_path, str) else file_path,
                post.source_path != file_path,  # is_move
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
        1. 先处理所有磁盘文件，识别移动 (Disk -> DB)
        2. 删除没有磁盘文件或移动候选的孤儿记录 (DB - Disk)

        Args:
            session: 数据库会话
            scanned_map: 磁盘文件映射 {path: ScannedPost}
            existing_map: 数据库现有记录映射 {path: Post}
            operating_user: 操作用户
            stats: 统计对象
        """
        processed_post_ids = set()
        # 先处理新路径，避免全量同步先删除移动前的文章。
        # 即使移动失败，也保留具有相同 slug 的孤儿，供下次重试。
        scanned_slugs = {
            scanned.frontmatter.get("slug")
            for scanned in scanned_map.values()
            if not scanned.is_category_index
        }
        for file_path, scanned in scanned_map.items():
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

        # 重新查询，避免使用失败回滚后过期的 ORM 对象。
        remaining_posts = await post_crud.get_posts_with_source_path(session)
        for post in remaining_posts:
            db_path = post.source_path
            if db_path not in scanned_map and post.slug not in scanned_slugs:
                async with self._file_savepoint(
                    session, stats, processed_post_ids, f"Deleting orphaned {db_path}"
                ) as (file_stats, _):
                    logger.info(f"Deleting orphaned post: {db_path} (slug={post.slug})")
                    await post_service.delete_post(
                        session, post.id, current_user=operating_user
                    )
                    file_stats.deleted.append(str(db_path))

        # 3. 🆕 后处理：批量修复内部链接
        # 因为在第一遍扫描时，目标文章可能还未入库，导致 ContentProcessor 无法解析链接
        # 所以需要在这个时候（所有文章都在 DB 后）再次尝试解析所有被 update/add 的文章
        if processed_post_ids:
            # 获取这批文章的路径映射（只有发生过变更的才需要重试）
            # 注意：这里我们重新查询 DB 确保状态最新
            await self.resolve_internal_links_for_posts(
                session, processed_post_ids, stats
            )

    async def sync_categories_to_disk(
        self, session: AsyncSession, writer, stats: SyncStats
    ):
        """
        (Disk -> DB 优先) 只为已存在的分类目录创建/更新 index.md
        并删除 Git 中已删除的分类

        Git 仓库是真理源（Source of Truth）：
        - 只有当分类目录在文件系统中存在时，才会创建/更新 index.md
        - 如果目录不存在，说明已在 Git 中删除，从数据库中删除该分类
        - 这确保了 Git 仓库的变更优先级高于数据库

        Args:
            session: 数据库会话
            writer:FileWriter 实例
            stats: 统计对象
        """
        from app.posts.cruds import category as category_crud

        categories = await category_crud.get_all_categories(session)
        categories_to_delete = []

        for category in categories:
            try:
                target_path = writer.path_calculator.calculate_category_path(category)

                # 与 write_category 使用同一份渲染结果，避免每次都判定为变更
                expected_content = writer.render_category_index(category)

                should_write = False
                if not target_path.exists():
                    # 目录存在但 index.md 不存在，创建它
                    should_write = True
                    logger.info(
                        f"Creating missing index.md for existing category directory: {category.slug}"
                    )
                else:
                    existing_content = await writer.file_operator.read_text(target_path)
                    if existing_content.strip() != expected_content.strip():
                        should_write = True
                        logger.debug(
                            f"Updating index.md for category '{category.slug}' due to metadata changes"
                        )

                if should_write:
                    is_new = not target_path.exists()
                    await writer.write_category(category)
                    rel_path = target_path.relative_to(self.content_dir)
                    if is_new:
                        if str(rel_path) not in stats.added:
                            stats.added.append(str(rel_path))
                    else:
                        if str(rel_path) not in stats.updated:
                            stats.updated.append(str(rel_path))
            except Exception as e:
                logger.error(f"Failed to sync category index for {category.slug}: {e}")

        # 删除 Git 中已不存在的分类
        if categories_to_delete:
            for category in categories_to_delete:
                try:
                    logger.info(
                        f"Deleting category '{category.name}' (slug: {category.slug}) "
                        f"as its directory was removed from Git"
                    )
                    await session.delete(category)

                    # 更新统计信息以触发缓存刷新
                    category_path = writer.path_calculator.calculate_category_path(
                        category
                    )
                    rel_path = str(category_path.relative_to(self.content_dir))
                    if rel_path not in stats.deleted:
                        stats.deleted.append(rel_path)
                        logger.debug(f"Added deleted category to stats: {rel_path}")
                except Exception as e:
                    logger.error(
                        f"Failed to delete category '{category.slug}' from database: {e}"
                    )

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
        pending_moves = set()

        if changed_files:
            logger.info(
                f"Incremental sync: processing {len(changed_files)} changed files."
            )
            # 先处理新增/移动，再删除，保留未被 Git 识别为 R 的文章身份。
            for status, *paths in sorted(
                changed_files, key=lambda change: change[0] == "D"
            ):
                file_path = paths[-1]
                old_path = paths[0] if status == "R" else None
                if old_path is not None and not is_content_file(old_path):
                    old_path = None

                # 🚫 与 scan_all 共用过滤规则：跳过非 md/mdx、说明文档与隐藏路径
                if not is_content_file(file_path):
                    if old_path is None:
                        logger.debug(f"🙈 Skipping non-content file: {file_path}")
                        continue
                    # 文章被移出内容范围（如改名为 README.md），按删除旧路径处理
                    status, file_path, old_path = "D", old_path, None

                async with self._file_savepoint(
                    session,
                    stats,
                    processed_post_ids,
                    f"Processing {status} {file_path}",
                ) as (file_stats, file_post_ids):
                    await self.process_file_change(
                        session,
                        file_path,
                        status,
                        existing_map,
                        operating_user,
                        file_stats,
                        file_post_ids,
                        old_path=old_path,
                        pending_moves=pending_moves,
                    )
