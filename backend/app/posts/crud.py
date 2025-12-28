"""
文章模块数据库操作 (CRUD)

使用 SQLModel 进行数据库操作，重点优化 N+1 查询问题。
"""

import logging
from typing import Optional, Sequence
from uuid import UUID

from app.posts.model import Category, Post, PostStatus, PostType, Tag
from sqlalchemy.orm import selectinload
from sqlmodel import and_, desc, select
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)

# ========================================
# 文章 (Post) CRUD
# ========================================


async def get_post_by_id(session: AsyncSession, post_id: UUID) -> Optional[Post]:
    """根据 ID 获取文章详情 (带全量关联预加载)"""
    stmt = (
        select(Post)
        .where(Post.id == post_id)
        .options(
            selectinload(Post.category),
            selectinload(Post.author),
            selectinload(Post.tags),
            selectinload(Post.cover_media),
        )
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_post_by_slug(session: AsyncSession, slug: str) -> Optional[Post]:
    """根据 Slug 获取文章详情"""
    stmt = (
        select(Post)
        .where(Post.slug == slug)
        .options(
            selectinload(Post.category),
            selectinload(Post.author),
            selectinload(Post.tags),
            selectinload(Post.cover_media),
        )
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_posts(
    session: AsyncSession,
    *,
    post_type: Optional[PostType] = None,
    status: Optional[PostStatus] = PostStatus.PUBLISHED,
    category_id: Optional[UUID] = None,
    tag_id: Optional[UUID] = None,
    author_id: Optional[UUID] = None,
    is_featured: Optional[bool] = None,
    search_query: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> Sequence[Post]:
    """
    获取文章列表 (高性能预加载版)

    采用 selectinload 解决 N+1 风险。
    """
    stmt = select(Post)

    # 基础过滤
    if post_type:
        stmt = stmt.where(Post.post_type == post_type)
    if status:
        stmt = stmt.where(Post.status == status)
    if author_id:
        stmt = stmt.where(Post.author_id == author_id)
    if is_featured is not None:
        stmt = stmt.where(Post.is_featured == is_featured)
    if category_id:
        stmt = stmt.where(Post.category_id == category_id)

    # 标签过滤 (多对多)
    if tag_id:
        # 这是一个技巧：通过 join 标签表来过滤，但后续加载依然用 selectinload 保持性能
        stmt = stmt.join(Post.tags).where(Tag.id == tag_id)

    # 搜索过滤
    if search_query:
        search_pattern = f"%{search_query}%"
        stmt = stmt.where(
            (Post.title.ilike(search_pattern)) | (Post.excerpt.ilike(search_pattern))
        )

    # 排序与分页
    stmt = (
        stmt.order_by(desc(Post.published_at), desc(Post.created_at))
        .limit(limit)
        .offset(offset)
    )

    # 加载关联 (解决显示作者名字、分类名、预览图时的 N+1)
    stmt = stmt.options(
        selectinload(Post.category),
        selectinload(Post.author),
        selectinload(Post.tags),
        selectinload(Post.cover_media),
    )

    result = await session.execute(stmt)
    return result.scalars().all()


async def increment_view_count(session: AsyncSession, post_id: UUID) -> None:
    """原子化递增浏览量"""
    # 这种写法避开了先查后改的竞态条件，也更高效
    from sqlalchemy import update

    stmt = update(Post).where(Post.id == post_id).values(view_count=Post.view_count + 1)
    await session.execute(stmt)
    await session.commit()


# ========================================
# 分类 (Category) CRUD
# ========================================


async def get_categories(
    session: AsyncSession, post_type: PostType
) -> Sequence[Category]:
    """
    获取指定板块(Post/Idea)的全量分类。

    这里是物理隔离的关键：只查出当前板块下的分类。
    """
    stmt = (
        select(Category)
        .where(Category.post_type == post_type)
        .where(Category.is_active)  # 修正：直接使用字段作为真值判断
        .order_by(Category.sort_order.asc(), Category.name.asc())
        .options(selectinload(Category.parent), selectinload(Category.icon))
    )
    result = await session.execute(stmt)
    return result.scalars().all()


async def get_category_by_slug_and_type(
    session: AsyncSession, slug: str, post_type: PostType
) -> Optional[Category]:
    """根据 Slug 和内容类型(板块)获取具体分类，用于前端导航展示"""
    stmt = (
        select(Category)
        .where(and_(Category.slug == slug, Category.post_type == post_type))
        .options(selectinload(Category.icon))
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_category_by_id(
    session: AsyncSession, category_id: UUID, post_type: Optional[PostType] = None
) -> Optional[Category]:
    """根据 ID 获取分类，可选带板块验证确保逻辑隔离"""
    stmt = select(Category).where(Category.id == category_id)
    if post_type:
        stmt = stmt.where(Category.post_type == post_type)

    result = await session.execute(stmt)
    return result.scalar_one_or_none()


# ========================================
# 标签 (Tag) CRUD
# ========================================


async def get_tags_by_type(
    session: AsyncSession, post_type: PostType, limit: int = 100
) -> Sequence[Tag]:
    """
    获取指定板块文章中所包含的所有标签。
    通过 join 只有在对应板块出现过的标签才会显示出来。
    """
    stmt = (
        select(Tag)
        .join(Tag.posts)
        .where(Post.post_type == post_type)
        .distinct()
        .order_by(Tag.name.asc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    return result.scalars().all()


async def get_tag_by_slug(session: AsyncSession, slug: str) -> Optional[Tag]:
    """根据 Slug 获取标签"""
    stmt = select(Tag).where(Tag.slug == slug)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_or_create_tag(session: AsyncSession, name: str, slug: str) -> Tag:
    """获取或创建标签 (用于同步 MDX 标签)"""
    stmt = select(Tag).where(Tag.name == name)
    result = await session.execute(stmt)
    tag = result.scalar_one_or_none()

    if not tag:
        tag = Tag(name=name, slug=slug)
        session.add(tag)
        await session.flush()  # 获取 ID 但不提交事务
    return tag
