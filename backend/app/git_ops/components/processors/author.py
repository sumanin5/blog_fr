import logging
from typing import Any, Dict
from uuid import UUID

from app.git_ops.components.scanner import ScannedPost
from app.git_ops.exceptions import GitOpsSyncError
from sqlmodel.ext.asyncio.session import AsyncSession

from .base import FieldProcessor

logger = logging.getLogger(__name__)


class AuthorProcessor(FieldProcessor):
    """处理 author_id 字段"""

    async def process(
        self,
        result: Dict[str, Any],
        meta: Dict[str, Any],
        scanned: ScannedPost,
        session: AsyncSession,
        dry_run: bool = False,
    ) -> None:
        from app.users import crud as user_crud

        # 如果 Frontmatter 里有 author_id，先验证它是否有效
        if result.get("author_id"):
            existing_user = await user_crud.get_user_by_id(session, result["author_id"])
            if existing_user:
                logger.info(
                    f"✅ Using existing author_id from frontmatter: {result['author_id']}"
                )
                return  # ID 有效，直接使用
            else:
                logger.warning(
                    f"⚠️ author_id {result['author_id']} from frontmatter not found in DB, will auto-resolve"
                )
                result["author_id"] = None  # 清空无效的 ID

        author_value = meta.get("author")
        if not author_value:
            raise GitOpsSyncError(
                f"Missing required field 'author' or 'author_id' in {scanned.file_path}",
                detail="Every post must specify an author",
            )

        result["author_id"] = await self._resolve_author_id(session, author_value)

    async def _resolve_author_id(
        self, session: AsyncSession, author_value: str
    ) -> UUID:
        """根据用户名或 UUID 查询作者 ID"""
        from app.users import crud as user_crud

        # 尝试作为 UUID 解析
        try:
            user_id = UUID(author_value)
            user = await user_crud.get_user_by_id(session, user_id)
            if user:
                return user.id
        except ValueError:
            pass

        # 作为用户名查询
        user = await user_crud.get_user_by_username(session, author_value)
        if user:
            return user.id

        raise GitOpsSyncError(f"Author not found: {author_value}")
