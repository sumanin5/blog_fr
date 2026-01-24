import logging
from typing import Any, Dict, Optional
from uuid import UUID

from app.git_ops.components.scanner import ScannedPost
from app.posts.model import PostType
from sqlmodel.ext.asyncio.session import AsyncSession

from .base import FieldProcessor

logger = logging.getLogger(__name__)


class CategoryProcessor(FieldProcessor):
    """处理 category_id 字段（优先使用路径推导）"""

    async def process(
        self,
        result: Dict[str, Any],
        meta: Dict[str, Any],
        scanned: ScannedPost,
        session: AsyncSession,
        dry_run: bool = False,
    ) -> None:
        if not result.get("category_id"):
            # 优先使用路径推导的分类
            if scanned.derived_category_slug is not None:
                category_slug = scanned.derived_category_slug
            else:
                category_slug = meta.get("category") or meta.get("category_slug")

            from app.core.config import settings

            result["category_id"] = await self._resolve_category_id(
                session,
                category_slug,
                result["post_type"],
                auto_create=settings.GIT_AUTO_CREATE_CATEGORIES
                if not dry_run
                else False,
                default_slug=settings.GIT_DEFAULT_CATEGORY,
            )

    async def _resolve_category_id(
        self,
        session: AsyncSession,
        category_value: Optional[str],
        post_type: str,
        auto_create: bool = True,
        default_slug: str = "uncategorized",
    ) -> Optional[UUID]:
        """根据 slug 查询或创建分类"""
        from app.posts import cruds as posts_crud
        from app.posts.model import Category

        if not category_value:
            category_value = default_slug

        # 将字符串转换为 PostType 枚举
        post_type_enum = PostType(post_type)

        category = await posts_crud.get_category_by_slug_and_type(
            session, category_value, post_type_enum
        )

        if category:
            return category.id

        if auto_create and category_value != default_slug:
            name = category_value.replace("-", " ").title()
            new_category = Category(
                name=name,
                slug=category_value,
                post_type=post_type_enum,
                description=f"Auto generated from folder {category_value}",
            )
            session.add(new_category)
            await session.commit()
            await session.refresh(new_category)
            return new_category.id

        if category_value != default_slug:
            return await self._resolve_category_id(
                session, default_slug, post_type, auto_create, default_slug
            )

        # Final fallback: create default category if absolutely missing
        default_cat = Category(
            name=default_slug.title(),
            slug=default_slug,
            post_type=post_type_enum,
            description="Default Category",
        )
        session.add(default_cat)
        await session.commit()
        await session.refresh(default_cat)
        return default_cat.id
