"""
文章模块数据库操作 (CRUD)

只包含异步数据库操作
"""

import logging
from typing import Optional
from uuid import UUID

from app.posts.model import Category, Post, PostType, Tag
from fastapi_pagination import Page, Params
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlalchemy.orm import selectinload
from sqlmodel import and_, func, select
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


# ========================================
# 通用分页函数
# ========================================


async def paginate_query(
    session: AsyncSession, query: select, params: Params = None
) -> Page:
    """通用分页查询"""
    return await paginate(session, query, params)


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
            selectinload(Post.versions),  # 预加载 versions
        )
    )
    result = await session.exec(stmt)
    return result.one_or_none()


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
            selectinload(Post.versions),  # 预加载 versions
        )
    )
    result = await session.exec(stmt)
    return result.one_or_none()


# 删除 get_posts_paginated，改用通用的 paginate_query


async def increment_view_count(session: AsyncSession, post_id: UUID) -> None:
    """原子化递增浏览量"""
    # 这种写法避开了先查后改的竞态条件，也更高效
    from sqlalchemy import update

    stmt = update(Post).where(Post.id == post_id).values(view_count=Post.view_count + 1)
    await session.exec(stmt)
    await session.commit()


async def increment_like_count(session: AsyncSession, post_id: UUID) -> int:
    """原子化递增点赞数"""
    from sqlalchemy import update

    # 执行更新
    stmt = update(Post).where(Post.id == post_id).values(like_count=Post.like_count + 1)
    await session.exec(stmt)
    await session.commit()

    # 返回最新数量
    post = await get_post_by_id(session, post_id)
    return post.like_count if post else 0


async def decrement_like_count(session: AsyncSession, post_id: UUID) -> int:
    """原子化递减点赞数（从不小于0）"""
    from sqlalchemy import update

    # 仅当数量大于0时减少
    stmt = (
        update(Post)
        .where(Post.id == post_id, Post.like_count > 0)
        .values(like_count=Post.like_count - 1)
    )
    await session.exec(stmt)
    await session.commit()

    post = await get_post_by_id(session, post_id)
    return post.like_count if post else 0


async def increment_bookmark_count(session: AsyncSession, post_id: UUID) -> int:
    """原子化递增收藏数"""
    from sqlalchemy import update

    stmt = (
        update(Post)
        .where(Post.id == post_id)
        .values(bookmark_count=Post.bookmark_count + 1)
    )
    await session.exec(stmt)
    await session.commit()

    post = await get_post_by_id(session, post_id)
    return post.bookmark_count if post else 0


async def decrement_bookmark_count(session: AsyncSession, post_id: UUID) -> int:
    """原子化递减收藏数（从不小于0）"""
    from sqlalchemy import update

    stmt = (
        update(Post)
        .where(Post.id == post_id, Post.bookmark_count > 0)
        .values(bookmark_count=Post.bookmark_count - 1)
    )
    await session.exec(stmt)
    await session.commit()

    post = await get_post_by_id(session, post_id)
    return post.bookmark_count if post else 0


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
    result = await session.exec(stmt)
    return result.one_or_none()


async def get_category_by_id(
    session: AsyncSession, category_id: UUID, post_type: Optional[PostType] = None
) -> Optional[Category]:
    """根据 ID 获取分类，可选带板块验证确保逻辑隔离"""
    stmt = select(Category).where(Category.id == category_id)
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
    await session.flush()
    await session.refresh(category)
    return category


async def update_category(
    session: AsyncSession, category: Category, update_data: dict
) -> Category:
    """更新分类"""
    for field, value in update_data.items():
        setattr(category, field, value)
    session.add(category)
    await session.flush()
    await session.refresh(category)
    return category


async def delete_category(session: AsyncSession, category: Category) -> None:
    """删除分类"""
    await session.delete(category)
    await session.flush()


# ========================================
# 标签 (Tag) CRUD
# ========================================

# 删除 get_tags_by_type，改用通用的 paginate_query


async def get_tag_by_slug(session: AsyncSession, slug: str) -> Optional[Tag]:
    """根据 Slug 获取标签"""
    stmt = select(Tag).where(Tag.slug == slug)
    result = await session.exec(stmt)
    return result.one_or_none()


async def list_tags_with_count(
    session: AsyncSession, params: Params, search: str = None
) -> Page[Tag]:
    """获取标签列表并附加文章关联数"""
    from app.posts.model import PostTagLink

    # 1. 基础查询
    stmt = select(Tag)
    if search:
        stmt = stmt.where(Tag.name.ilike(f"%{search}%"))
    stmt = stmt.order_by(Tag.name)

    # 2. 分页
    page = await paginate_query(session, stmt, params)

    if not page.items:
        return page

    # 3. 聚合查询计数
    tag_ids = [tag.id for tag in page.items]
    count_stmt = (
        select(PostTagLink.tag_id, func.count(PostTagLink.post_id))
        .where(PostTagLink.tag_id.in_(tag_ids))
        .group_by(PostTagLink.tag_id)
    )
    count_result = await session.exec(count_stmt)
    count_map = {row[0]: row[1] for row in count_result.all()}

    # 4. 填充计数
    for tag in page.items:
        setattr(tag, "post_count", count_map.get(tag.id, 0))

    return page


async def get_tag_by_id(session: AsyncSession, tag_id: UUID) -> Optional[Tag]:
    """根据 ID 获取标签"""
    stmt = select(Tag).where(Tag.id == tag_id)
    result = await session.exec(stmt)
    return result.one_or_none()


async def get_or_create_tag(session: AsyncSession, name: str, slug: str) -> Tag:
    """获取或创建标签 (用于同步 MDX 标签)"""
    stmt = select(Tag).where(Tag.name == name)
    result = await session.exec(stmt)
    tag = result.one_or_none()

    if not tag:
        tag = Tag(name=name, slug=slug)
        session.add(tag)
        await session.flush()  # 获取 ID 但不提交事务
    return tag


async def get_orphaned_tags(session: AsyncSession) -> list[Tag]:
    """获取孤立标签（没有任何文章关联）"""
    from app.posts.model import PostTagLink
    from sqlalchemy import not_

    # 查找不在 PostTagLink 中的标签
    stmt = (
        select(Tag)
        .where(not_(Tag.id.in_(select(PostTagLink.tag_id))))
        .order_by(Tag.name)
    )
    result = await session.exec(stmt)
    return list(result.all())


async def update_tag(session: AsyncSession, tag: Tag, update_data: dict) -> Tag:
    """更新标签"""
    for field, value in update_data.items():
        setattr(tag, field, value)
    session.add(tag)
    await session.flush()
    await session.refresh(tag)
    return tag


async def delete_tag(session: AsyncSession, tag: Tag) -> None:
    """删除标签"""
    await session.delete(tag)
    await session.flush()


async def merge_tags(
    session: AsyncSession, source_tag_id: UUID, target_tag_id: UUID
) -> Tag:
    """合并标签：将 source_tag 的所有文章关联转移到 target_tag，然后删除 source_tag"""
    from app.posts.model import PostTagLink
    from sqlalchemy import delete, update

    # 1. 处理冲突：如果文章已经有了 target_tag，直接删除 source_tag 的关联
    # 避免 UPDATE 时产生 (post_id, target_tag_id) 的重复键
    stmt_conflict = (
        delete(PostTagLink)
        .where(PostTagLink.tag_id == source_tag_id)
        .where(
            PostTagLink.post_id.in_(
                select(PostTagLink.post_id).where(PostTagLink.tag_id == target_tag_id)
            )
        )
    )
    await session.exec(stmt_conflict)

    # 2. 更新剩余的关联：source_tag → target_tag
    stmt = (
        update(PostTagLink)
        .where(PostTagLink.tag_id == source_tag_id)
        .values(tag_id=target_tag_id)
    )
    await session.exec(stmt)

    # 删除源标签
    source_tag = await get_tag_by_id(session, source_tag_id)
    if source_tag:
        await session.delete(source_tag)

    # 返回目标标签
    target_tag = await get_tag_by_id(session, target_tag_id)
    await session.flush()
    return target_tag


async def get_posts_with_source_path(session: AsyncSession) -> list[Post]:
    """获取所有有 source_path 的文章（用于 Git 同步）"""
    stmt = select(Post).where(Post.source_path.isnot(None))
    result = await session.exec(stmt)
    return list(result.all())


# ============================================================================
# PostVersion 功能暂时禁用 - 参考 service.py 中的说明
# ============================================================================
# async def get_max_post_version(session, post_id: UUID) -> int:
#     """获取最大版本号"""
#     stmt = select(func.max(PostVersion.version_num)).where(
#         PostVersion.post_id == post_id
#     )
#     result = await session.exec(stmt)
#     return result.one() or 0
