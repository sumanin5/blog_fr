from typing import Annotated
from uuid import UUID

from app.core.db import get_async_session
from app.posts import cruds, services
from app.posts.model import PostType
from app.posts.schemas import (
    TagCleanupResponse,
    TagMergeRequest,
    TagResponse,
    TagUpdate,
)
from app.users.dependencies import get_current_active_user, get_current_superuser
from app.users.model import User
from fastapi import APIRouter, Depends, Path, Query, status
from fastapi_pagination import Page, Params
from sqlmodel.ext.asyncio.session import AsyncSession

from .tags_doc import (
    DELETE_ORPHANED_TAGS_DOC,
    LIST_TAGS_BY_TYPE_DOC,
    LIST_TAGS_DOC,
    MERGE_TAGS_DOC,
    UPDATE_TAG_DOC,
)

router = APIRouter(tags=["Posts - Tags"])


# ========================================
# 标签管理接口 (需要超级管理员) - 防止 Admin 被视为 PostType，需放在动态路由前
# ========================================


@router.get(
    "/admin/tags",
    response_model=Page[TagResponse],
    summary="获取所有标签",
    description=LIST_TAGS_DOC,
)
async def list_tags(
    params: Annotated[Params, Depends()],
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    search: Annotated[
        str | None, Query(description="搜索关键词，支持标签名称模糊搜索")
    ] = None,
):
    """获取所有标签列表（支持搜索）"""
    return await cruds.list_tags_with_count(session, params, search)


@router.delete(
    "/admin/tags/orphaned",
    response_model=TagCleanupResponse,
    status_code=status.HTTP_200_OK,
    summary="清理孤立标签",
    description=DELETE_ORPHANED_TAGS_DOC,
)
async def delete_orphaned_tags(
    current_user: Annotated[User, Depends(get_current_superuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """删除孤立标签（仅超级管理员）"""
    deleted_count, deleted_names = await services.delete_orphaned_tags(
        session, current_user
    )
    return {
        "deleted_count": deleted_count,
        "deleted_tags": deleted_names,
        "message": f"已删除 {deleted_count} 个孤立标签",
    }


@router.post(
    "/admin/tags/merge",
    response_model=TagResponse,
    summary="合并标签",
    description=MERGE_TAGS_DOC,
)
async def merge_tags(
    request: TagMergeRequest,
    current_user: Annotated[User, Depends(get_current_superuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """合并标签（仅超级管理员）"""
    return await services.merge_tags(
        session, request.source_tag_id, request.target_tag_id, current_user
    )


@router.patch(
    "/admin/tags/{tag_id}",
    response_model=TagResponse,
    summary="更新标签",
    description=UPDATE_TAG_DOC,
)
async def update_tag(
    tag_id: UUID,
    tag_in: TagUpdate,
    current_user: Annotated[User, Depends(get_current_superuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """更新标签（仅超级管理员）"""
    return await services.update_tag(session, tag_id, tag_in, current_user)


# ========================================
# 动态路由 - 必须放在最后
# ========================================


@router.get(
    "/{post_type}/tags",
    response_model=Page[TagResponse],
    summary="获取指定板块的标签列表",
    description=LIST_TAGS_BY_TYPE_DOC,
)
async def list_tags_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    params: Annotated[Params, Depends()],
):
    from app.posts.cruds import tag as tag_crud

    return await tag_crud.list_tags_with_count(session, params, post_type=post_type)
