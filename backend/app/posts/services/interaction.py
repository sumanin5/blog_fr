import logging
from uuid import UUID

from app.posts import cruds as crud
from app.posts.exceptions import PostNotFoundError
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


async def update_post_like(
    session: AsyncSession, post_id: UUID, increment: bool = True
) -> int:
    """更新文章点赞数

    Args:
        session: 数据库会话
        post_id: 文章ID
        increment: True为增加，False为减少

    Returns:
        最新点赞数
    """
    post = await crud.get_post_by_id(session, post_id)
    if not post:
        raise PostNotFoundError()

    if increment:
        count = await crud.increment_like_count(session, post_id)
        logger.debug(f"文章点赞 +1: {post.title} (Top: {count})")
    else:
        count = await crud.decrement_like_count(session, post_id)
        logger.debug(f"文章点赞 -1: {post.title} (Top: {count})")

    return count


async def update_post_bookmark(
    session: AsyncSession, post_id: UUID, increment: bool = True
) -> int:
    """更新文章收藏数

    Args:
        session: 数据库会话
        post_id: 文章ID
        increment: True为增加，False为减少

    Returns:
        最新收藏数
    """
    post = await crud.get_post_by_id(session, post_id)
    if not post:
        raise PostNotFoundError()

    if increment:
        count = await crud.increment_bookmark_count(session, post_id)
        logger.debug(f"文章收藏 +1: {post.title} (Book: {count})")
    else:
        count = await crud.decrement_bookmark_count(session, post_id)
        logger.debug(f"文章收藏 -1: {post.title} (Book: {count})")

    return count
