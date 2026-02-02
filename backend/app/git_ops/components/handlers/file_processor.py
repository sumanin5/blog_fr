"""
文件处理器 - 统一处理文件的新增、更新、删除逻辑
"""

import logging
from pathlib import Path
from typing import Any, Dict

from sqlmodel.ext.asyncio.session import AsyncSession

from app.git_ops.components.handlers.category_sync import handle_category_sync
from app.git_ops.components.handlers.post_create import handle_post_create
from app.git_ops.components.handlers.post_update import handle_post_update
from app.git_ops.components.scanner import MDXScanner
from app.git_ops.components.serializer import PostSerializer
from app.git_ops.schema import SyncStats
from app.posts import services as post_service
from app.posts.model import Post
from app.users.model import User

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

    async def process_file_change(
        self,
        session: AsyncSession,
        file_path: str,
        status: str,  # "A" (added), "M" (modified), "D" (deleted)
        existing_map: Dict[str, Post],
        operating_user: User,
        stats: SyncStats,
        processed_post_ids: set,
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
        from app.git_ops.exceptions import collect_errors

        # 1. 删除数据库中多余的记录（文件系统中不存在的）
        for db_path, post in existing_map.items():
            if db_path not in scanned_map:
                async with collect_errors(stats, f"Deleting orphaned {db_path}"):
                    logger.info(f"Deleting orphaned post: {db_path} (slug={post.slug})")
                    await post_service.delete_post(
                        session, post.id, current_user=operating_user
                    )
                    stats.deleted.append(str(db_path))

        # 2. 处理扫描到的文件 (Disk -> DB)
        processed_post_ids = set()
        for file_path, scanned in scanned_map.items():
            async with collect_errors(stats, f"Processing {file_path}"):
                await self.process_scanned_file(
                    session,
                    file_path,
                    scanned,
                    existing_map,
                    operating_user,
                    stats,
                    processed_post_ids,
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
        import frontmatter

        from app.posts.cruds import category as category_crud

        categories = await category_crud.get_all_categories(session)
        categories_to_delete = []

        for category in categories:
            try:
                target_path = writer.path_calculator.calculate_category_path(category)
                category_dir = target_path.parent

                # 关键改变：如果分类目录不存在，标记为删除
                if not category_dir.exists():
                    logger.info(
                        f"Category directory '{category.slug}' not found in Git, "
                        f"marking for deletion from database"
                    )
                    categories_to_delete.append(category)
                    continue

                # 构建期望的内容
                meta = {"title": category.name, "hidden": not category.is_active}
                if category.icon_preset:
                    meta["icon"] = category.icon_preset
                if category.sort_order != 0:
                    meta["order"] = category.sort_order
                if category.excerpt:
                    meta["excerpt"] = category.excerpt
                if category.cover_media_id:
                    meta["cover_media_id"] = str(category.cover_media_id)
                    if hasattr(category, "cover_media") and category.cover_media:
                        meta["cover"] = category.cover_media.original_filename

                expected_content = frontmatter.dumps(
                    frontmatter.Post(category.description or "", **meta)
                )

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
        from app.git_ops.exceptions import collect_errors

        processed_post_ids = set()

        if changed_files:
            logger.info(
                f"Incremental sync: processing {len(changed_files)} changed files."
            )
            for status, file_path in changed_files:
                if not file_path.endswith((".md", ".mdx")):
                    continue

                async with collect_errors(stats, f"Processing {status} {file_path}"):
                    await self.process_file_change(
                        session,
                        file_path,
                        status,
                        existing_map,
                        operating_user,
                        stats,
                        processed_post_ids,
                    )
