"""
文件处理器 - 统一处理文件的新增、更新、删除逻辑
"""

import logging
from pathlib import Path
from typing import Dict

from app.git_ops.components.handlers.category_sync import handle_category_sync
from app.git_ops.components.handlers.post_create import handle_post_create
from app.git_ops.components.handlers.post_update import handle_post_update
from app.git_ops.components.scanner import MDXScanner
from app.git_ops.components.serializer import PostSerializer
from app.git_ops.schema import SyncStats
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
