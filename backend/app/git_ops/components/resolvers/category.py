import logging
from typing import Optional
from uuid import UUID

logger = logging.getLogger(__name__)


async def resolve_category_id(
    session,
    category_value: Optional[str],
    post_type: str,
    auto_create: bool = True,
    default_slug: str = "uncategorized",
) -> Optional[UUID]:
    """根据 slug 查询或创建分类"""
    from app.posts import crud as posts_crud
    from app.posts.model import Category

    if not category_value:
        category_value = default_slug

    if hasattr(post_type, "value"):
        post_type = post_type.value

    category = await posts_crud.get_category_by_slug_and_type(
        session, category_value, post_type
    )

    if category:
        return category.id

    if auto_create and category_value != default_slug:
        name = category_value.replace("-", " ").title()
        new_category = Category(
            name=name,
            slug=category_value,
            post_type=post_type,
            description=f"Auto generated from folder {category_value}",
        )
        session.add(new_category)
        await session.commit()
        await session.refresh(new_category)
        return new_category.id

    if category_value != default_slug:
        return await resolve_category_id(
            session, default_slug, post_type, auto_create, default_slug
        )

    # Final fallback: create default category if absolutely missing
    default_cat = Category(
        name=default_slug.title(),
        slug=default_slug,
        post_type=post_type,
        description="Default Category",
    )
    session.add(default_cat)
    await session.commit()
    await session.refresh(default_cat)
    return default_cat.id
