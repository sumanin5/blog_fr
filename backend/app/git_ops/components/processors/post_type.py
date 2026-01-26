import logging
from typing import Any, Dict, Optional

from app.git_ops.components.scanner import ScannedPost
from app.git_ops.exceptions import GitOpsSyncError
from app.posts.model import PostType
from sqlmodel.ext.asyncio.session import AsyncSession

from .base import FieldProcessor

logger = logging.getLogger(__name__)


class PostTypeProcessor(FieldProcessor):
    """处理 post_type 字段（优先使用路径推导）"""

    async def process(
        self,
        result: Dict[str, Any],
        meta: Dict[str, Any],
        scanned: ScannedPost,
        session: AsyncSession,
        dry_run: bool = False,
    ) -> None:
        # 优先使用路径推导的 post_type
        if scanned.derived_post_type:
            post_type_enum = await self._resolve_post_type(
                meta_type=None,
                derived_type=scanned.derived_post_type,
            )
            result["post_type"] = post_type_enum.value
        elif not result.get("post_type"):
            post_type_enum = await self._resolve_post_type(
                meta_type=meta.get("type") or meta.get("post_type"),
                derived_type=None,
            )
            result["post_type"] = post_type_enum.value

    async def _resolve_post_type(
        self, meta_type: Optional[str], derived_type: Optional[str]
    ) -> PostType:
        """解析 post_type"""
        post_type_value = derived_type or meta_type
        if not post_type_value:
            return PostType.ARTICLES

        post_type_value = post_type_value.lower()
        try:
            return PostType(post_type_value)
        except ValueError:
            available_types = [t.value for t in PostType]
            raise GitOpsSyncError(
                f"Invalid post_type '{post_type_value}'",
                detail=f"Available types: {available_types}",
            )
