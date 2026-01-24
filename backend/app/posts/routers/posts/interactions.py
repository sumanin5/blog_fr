from typing import Annotated
from uuid import UUID

from app.core.db import get_async_session
from app.posts import services as service
from app.posts.schemas import PostBookmarkResponse, PostLikeResponse
from fastapi import APIRouter, Depends, Path
from sqlmodel.ext.asyncio.session import AsyncSession

from .doc import (
    BOOKMARK_POST_DOC,
    LIKE_POST_DOC,
    UNBOOKMARK_POST_DOC,
    UNLIKE_POST_DOC,
)

router = APIRouter(tags=["Posts - Interactions"])

# ========================================
# 互动接口 (无需认证)
# ========================================


@router.post(
    "/{post_type}/{post_id}/like",
    response_model=PostLikeResponse,
    summary="点赞文章",
    description=LIKE_POST_DOC,
)
async def like_post(
    post_id: Annotated[UUID, Path(description="文章 ID")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    count = await service.update_post_like(session, post_id, increment=True)
    return {"like_count": count}


@router.delete(
    "/{post_type}/{post_id}/like",
    response_model=PostLikeResponse,
    summary="取消点赞",
    description=UNLIKE_POST_DOC,
)
async def unlike_post(
    post_id: Annotated[UUID, Path(description="文章 ID")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    count = await service.update_post_like(session, post_id, increment=False)
    return {"like_count": count}


@router.post(
    "/{post_type}/{post_id}/bookmark",
    response_model=PostBookmarkResponse,
    summary="收藏文章",
    description=BOOKMARK_POST_DOC,
)
async def bookmark_post(
    post_id: Annotated[UUID, Path(description="文章 ID")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    count = await service.update_post_bookmark(session, post_id, increment=True)
    return {"bookmark_count": count}


@router.delete(
    "/{post_type}/{post_id}/bookmark",
    response_model=PostBookmarkResponse,
    summary="取消收藏",
    description=UNBOOKMARK_POST_DOC,
)
async def unbookmark_post(
    post_id: Annotated[UUID, Path(description="文章 ID")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    count = await service.update_post_bookmark(session, post_id, increment=False)
    return {"bookmark_count": count}
