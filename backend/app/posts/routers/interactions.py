from typing import Annotated
from uuid import UUID

from app.core.db import get_async_session
from app.posts import service
from app.posts.schema import PostBookmarkResponse, PostLikeResponse
from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter()

# ========================================
# 互动接口 (无需认证)
# ========================================


@router.post(
    "/{post_type}/{post_id}/like",
    response_model=PostLikeResponse,
    summary="点赞文章",
)
async def like_post(
    post_id: UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """点赞文章 (+1)"""
    count = await service.update_post_like(session, post_id, increment=True)
    return {"like_count": count}


@router.delete(
    "/{post_type}/{post_id}/like",
    response_model=PostLikeResponse,
    summary="取消点赞",
)
async def unlike_post(
    post_id: UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """取消点赞 (-1)"""
    count = await service.update_post_like(session, post_id, increment=False)
    return {"like_count": count}


@router.post(
    "/{post_type}/{post_id}/bookmark",
    response_model=PostBookmarkResponse,
    summary="收藏文章",
)
async def bookmark_post(
    post_id: UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """收藏文章 (+1)"""
    count = await service.update_post_bookmark(session, post_id, increment=True)
    return {"bookmark_count": count}


@router.delete(
    "/{post_type}/{post_id}/bookmark",
    response_model=PostBookmarkResponse,
    summary="取消收藏",
)
async def unbookmark_post(
    post_id: UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """取消收藏 (-1)"""
    count = await service.update_post_bookmark(session, post_id, increment=False)
    return {"bookmark_count": count}
