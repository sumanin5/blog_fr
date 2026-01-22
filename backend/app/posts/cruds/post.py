from typing import Optional
from uuid import UUID

from app.posts.model import Post
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession


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


async def get_posts_with_source_path(session: AsyncSession) -> list[Post]:
    """获取所有有 source_path 的文章（用于 Git 同步）"""
    stmt = select(Post).where(Post.source_path.isnot(None))
    result = await session.exec(stmt)
    return list(result.all())
