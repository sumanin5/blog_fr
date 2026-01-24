from typing import Annotated
from uuid import UUID

from app.core.db import get_async_session
from app.git_ops.background_tasks import run_background_commit
from app.posts import services, utils
from app.posts.model import PostType
from app.posts.schemas import (
    PostCreate,
    PostDetailResponse,
    PostPreviewRequest,
    PostPreviewResponse,
    PostUpdate,
)
from app.users.dependencies import get_current_active_user
from app.users.model import User
from fastapi import APIRouter, BackgroundTasks, Depends, Path, status
from sqlmodel.ext.asyncio.session import AsyncSession

from .doc import (
    CREATE_POST_BY_TYPE_DOC,
    DELETE_POST_BY_TYPE_DOC,
    PREVIEW_POST_DOC,
    UPDATE_POST_BY_TYPE_DOC,
)

router = APIRouter(tags=["Posts - Articles"])


@router.post(
    "/preview",
    response_model=PostPreviewResponse,
    summary="文章实时预览",
    description=PREVIEW_POST_DOC,
)
async def preview_post(request: PostPreviewRequest):
    return await utils.PostProcessor(request.content_mdx).process()


# ========================================
# 创作接口 (需要认证)
# ========================================


@router.post(
    "/{post_type}",
    response_model=PostDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建文章",
    description=CREATE_POST_BY_TYPE_DOC,
)
async def create_post_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    post_in: PostCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    background_tasks: BackgroundTasks,
):
    post_in.post_type = post_type
    post = await services.create_post(session, post_in, current_user.id)

    # 触发自动提交
    background_tasks.add_task(run_background_commit, f"Create post: {post.title}")

    return post


@router.patch(
    "/{post_type}/{post_id}",
    response_model=PostDetailResponse,
    summary="更新文章",
    description=UPDATE_POST_BY_TYPE_DOC,
)
async def update_post_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    post_id: UUID,
    post_in: PostUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    background_tasks: BackgroundTasks,
):
    post = await services.update_post(session, post_id, post_in, current_user)

    # 触发自动提交
    background_tasks.add_task(run_background_commit, f"Update post: {post.title}")

    return post


@router.delete(
    "/{post_type}/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除文章",
    description=DELETE_POST_BY_TYPE_DOC,
)
async def delete_post_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    post_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    background_tasks: BackgroundTasks,
):
    await services.delete_post(session, post_id, current_user)

    # 触发自动提交
    background_tasks.add_task(run_background_commit, f"Delete post: {post_id}")

    return None
