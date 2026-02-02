from typing import List, Optional
from uuid import UUID

from app.posts.model import Category, PostType
from sqlalchemy.orm import selectinload
from sqlmodel import and_, select
from sqlmodel.ext.asyncio.session import AsyncSession


async def get_category_by_slug_and_type(
    session: AsyncSession, slug: str, post_type: PostType
) -> Optional[Category]:
    """根据 Slug 和内容类型(板块)获取具体分类，用于前端导航展示"""
    stmt = (
        select(Category)
        .where(and_(Category.slug == slug, Category.post_type == post_type))
        .options(selectinload(Category.icon), selectinload(Category.cover_media))  # type: ignore
    )
    result = await session.exec(stmt)
    return result.one_or_none()


async def get_category_by_id(
    session: AsyncSession, category_id: UUID, post_type: Optional[PostType] = None
) -> Optional[Category]:
    """根据 ID 获取分类，可选带板块验证确保逻辑隔离"""
    stmt = (
        select(Category)
        .where(Category.id == category_id)
        .options(selectinload(Category.icon), selectinload(Category.cover_media))
    )
    if post_type:
        stmt = stmt.where(Category.post_type == post_type)

    result = await session.exec(stmt)
    return result.one_or_none()


async def get_category_by_slug(
    session: AsyncSession, slug: str, post_type: Optional[PostType] = None
) -> Optional[Category]:
    """根据 Slug 获取分类（用于检查 slug 冲突）"""
    stmt = select(Category).where(Category.slug == slug)
    if post_type:
        stmt = stmt.where(Category.post_type == post_type)

    result = await session.exec(stmt)
    return result.one_or_none()


async def create_category(session: AsyncSession, category: Category) -> Category:
    """创建分类"""
    session.add(category)
    await session.commit()
    await session.refresh(category)
    # Re-fetch to load relationships
    return await get_category_by_id(session, category.id)  # type: ignore


async def update_category(
    session: AsyncSession, category: Category, update_data: dict
) -> Category:
    """更新分类"""
    for field, value in update_data.items():
        setattr(category, field, value)
    session.add(category)
    await session.commit()
    await session.refresh(category)
    # Re-fetch to load relationships
    return await get_category_by_id(session, category.id)  # type: ignore


async def delete_category(session: AsyncSession, category: Category) -> None:
    """删除分类"""
    await session.delete(category)
    await session.flush()


async def get_all_categories(session: AsyncSession) -> List[Category]:
    """获取所有分类"""
    # 显式加载关联数据以避免 lazy load 错误
    from sqlalchemy.orm import selectinload

    stmt = select(Category).options(
        selectinload(Category.icon), selectinload(Category.cover_media)
    )
    result = await session.exec(stmt)
    return list(result.all())
