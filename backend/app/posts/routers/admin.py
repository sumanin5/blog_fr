from typing import Annotated
from uuid import UUID

from app.core.db import get_async_session
from app.posts import crud, service
from app.posts.model import PostType
from app.posts.schema import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    TagCleanupResponse,
    TagMergeRequest,
    TagResponse,
    TagUpdate,
)
from app.users.dependencies import get_current_active_user, get_current_superuser
from app.users.model import User
from fastapi import APIRouter, Depends, Path, status
from fastapi_pagination import Page, Params
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter()

# ========================================
# 标签管理接口 (需要超级管理员) - 防止 Admin 被视为 PostType，需放在动态路由前
# ========================================


@router.get("/admin/tags", response_model=Page[TagResponse], summary="获取所有标签")
async def list_tags(
    params: Annotated[Params, Depends()],
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    search: str = None,
):
    """获取所有标签列表（支持搜索）"""
    return await crud.list_tags_with_count(session, params, search)


@router.delete(
    "/admin/tags/orphaned",
    response_model=TagCleanupResponse,
    status_code=status.HTTP_200_OK,
    summary="清理孤立标签",
)
async def delete_orphaned_tags(
    current_user: Annotated[User, Depends(get_current_superuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """删除孤立标签（仅超级管理员）"""
    deleted_count, deleted_names = await service.delete_orphaned_tags(
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
)
async def merge_tags(
    request: TagMergeRequest,
    current_user: Annotated[User, Depends(get_current_superuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """合并标签（仅超级管理员）"""
    return await service.merge_tags(
        session, request.source_tag_id, request.target_tag_id, current_user
    )


@router.patch("/admin/tags/{tag_id}", response_model=TagResponse, summary="更新标签")
async def update_tag(
    tag_id: UUID,
    tag_in: TagUpdate,
    current_user: Annotated[User, Depends(get_current_superuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """更新标签（仅超级管理员）"""
    return await service.update_tag(session, tag_id, tag_in, current_user)


# ========================================
# 分类管理接口 (需要超级管理员)
# ========================================


@router.post(
    "/{post_type}/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建分类",
)
async def create_category_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    category_in: CategoryCreate,
    current_user: Annotated[User, Depends(get_current_superuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """创建新分类（仅超级管理员）

    示例：
    - POST /posts/article/categories - 创建文章分类
    - POST /posts/idea/categories - 创建想法分类
    """
    # 确保 post_type 匹配
    category_in.post_type = post_type
    return await service.create_category(session, category_in, current_user)


@router.patch(
    "/{post_type}/categories/{category_id}",
    response_model=CategoryResponse,
    summary="更新分类",
)
async def update_category_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    category_id: UUID,
    category_in: CategoryUpdate,
    current_user: Annotated[User, Depends(get_current_superuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """更新分类（仅超级管理员）

    示例：
    - PATCH /posts/article/categories/{category_id}
    - PATCH /posts/idea/categories/{category_id}
    """
    return await service.update_category(
        session, category_id, category_in, current_user, post_type
    )


@router.delete(
    "/{post_type}/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除分类",
)
async def delete_category_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    category_id: UUID,
    current_user: Annotated[User, Depends(get_current_superuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """删除分类（仅超级管理员）

    示例：
    - DELETE /posts/article/categories/{category_id}
    - DELETE /posts/idea/categories/{category_id}
    """
    await service.delete_category(session, category_id, current_user, post_type)
    return None
