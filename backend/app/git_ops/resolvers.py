"""
Git 同步的解析器模块

负责解析 MDX frontmatter 中的引用（作者、封面等）
"""

import logging
from pathlib import Path
from typing import Optional
from uuid import UUID

from app.git_ops.exceptions import GitOpsSyncError
from app.users.model import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

logger = logging.getLogger(__name__)


class AuthorResolver:
    """作者解析器"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def resolve(self, author_value: str) -> UUID:
        """根据用户名或 ID 查询作者

        Args:
            author_value: 用户名或 UUID

        Returns:
            用户 ID

        Raises:
            GitOpsSyncError: 如果作者不存在
        """
        if not author_value:
            raise GitOpsSyncError(
                "Author value is empty", detail="Author field cannot be empty"
            )

        # 尝试作为 UUID 解析
        user_id = None
        is_uuid = False

        # 检查是否为 UUID 格式
        if len(author_value) == 36 and author_value.count("-") == 4:
            user_id = UUID(author_value)
            is_uuid = True
            stmt = select(User).where(User.id == user_id)
            result = await self.session.exec(stmt)
            user = result.first()
            if user:
                return user.id

        # 作为用户名查询
        if not is_uuid:
            stmt = select(User).where(User.username == author_value)
            result = await self.session.exec(stmt)
            user = result.first()

            if user:
                logger.info(f"通过用户名匹配到作者: {author_value} -> {user.id}")
                return user.id

        # 未找到用户
        logger.warning(f"未找到作者: {author_value}")
        raise GitOpsSyncError(
            f"Author not found: {author_value}",
            detail=f"User '{author_value}' does not exist in database",
        )


class CoverResolver:
    """封面图解析器"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def resolve(self, cover_path: str) -> Optional[UUID]:
        """根据文件路径查询媒体库 ID

        Args:
            cover_path: 封面图路径（相对路径或文件名）

        Returns:
            媒体文件 ID 或 None
        """
        if not cover_path:
            return None

        from app.media.model import MediaFile

        # 尝试精确匹配路径
        stmt = select(MediaFile).where(MediaFile.file_path == cover_path)
        result = await self.session.exec(stmt)
        media = result.first()

        if media:
            return media.id

        # 如果精确匹配失败，尝试模糊匹配文件名
        filename = Path(cover_path).name
        stmt = select(MediaFile).where(MediaFile.original_filename == filename)
        result = await self.session.exec(stmt)
        media = result.first()

        if media:
            logger.info(f"通过文件名匹配到封面: {filename} -> {media.file_path}")
            return media.id

        logger.warning(f"未找到封面图: {cover_path}")
        return None
