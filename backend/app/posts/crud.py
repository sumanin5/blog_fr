"""
文章模块数据库操作 (CRUD)

只包含异步数据库操作
"""

import logging
from typing import Optional
from uuid import UUID

from app.posts.model import Category, Post, PostType, Tag
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlalchemy.orm import selectinload
from sqlmodel import and_, select
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


# ========================================
# 通用分页函数
# ========================================


async def paginate_query(session: AsyncSession, query) -> Page:
    """通用分页查询"""
    return await paginate(session, query)


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


# 删除 get_posts_paginated，改用通用的 paginate_query


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


# 删除 get_categories 和 get_tags_by_type，改用通用的 paginate_query


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

# 删除 get_tags_by_type，改用通用的 paginate_query


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
