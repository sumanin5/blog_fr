import logging
from typing import Any, Dict, List
from uuid import UUID

from app.git_ops.components.scanner import ScannedPost
from sqlmodel.ext.asyncio.session import AsyncSession

from .base import FieldProcessor

logger = logging.getLogger(__name__)


class TagsProcessor(FieldProcessor):
    """处理 tags 和 tag_ids 字段"""

    async def process(
        self,
        result: Dict[str, Any],
        meta: Dict[str, Any],
        scanned: ScannedPost,
        session: AsyncSession,
        dry_run: bool = False,
    ) -> None:
        tags = meta.get("tags")
        if tags is not None:
            # Pydantic 已经处理了逗号分隔，这里直接使用
            if isinstance(tags, str):
                tags = [t.strip() for t in tags.split(",")]

            result["tag_ids"] = await self._resolve_tag_ids(
                session, tags, auto_create=not dry_run
            )
            result["tags"] = tags

    async def _resolve_tag_ids(
        self, session: AsyncSession, tag_names: List[str], auto_create: bool = True
    ) -> List[UUID]:
        """根据标签名称查询或创建标签"""
        from app.posts import crud as posts_crud
        from slugify import slugify as python_slugify

        if not tag_names:
            return []

        tag_ids = []
        for tag_name in tag_names:
            tag_name = tag_name.strip()
            if not tag_name:
                continue

            tag_slug = python_slugify(tag_name)

            if auto_create:
                tag = await posts_crud.get_or_create_tag(session, tag_name, tag_slug)
                tag_ids.append(tag.id)
            else:
                # Dry run: 只查询，不创建
                tag = await posts_crud.get_tag_by_slug(session, tag_slug)
                if tag:
                    tag_ids.append(tag.id)

        return tag_ids
