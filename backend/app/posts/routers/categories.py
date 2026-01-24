from typing import Annotated
from uuid import UUID

from app.core.db import get_async_session
from app.posts import services as service
from app.posts.model import PostType
from app.posts.schemas import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
)
from app.users.dependencies import get_current_superuser
from app.users.model import User
from fastapi import APIRouter, Depends, Path, Query, status
from sqlmodel.ext.asyncio.session import AsyncSession

from .categories_doc import (
    CREATE_CATEGORY_BY_TYPE_DOC,
    DELETE_CATEGORY_BY_TYPE_DOC,
    LIST_CATEGORIES_BY_TYPE_DOC,
    UPDATE_CATEGORY_BY_TYPE_DOC,
)

router = APIRouter(tags=["Posts - Categories"])
# ========================================
# 分类管理接口 (需要超级管理员)
# ========================================


@router.post(
    "/{post_type}/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建分类",
    description=CREATE_CATEGORY_BY_TYPE_DOC,
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
    description=UPDATE_CATEGORY_BY_TYPE_DOC,
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
    description=DELETE_CATEGORY_BY_TYPE_DOC,
)
async def delete_category_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    category_id: UUID,
    current_user: Annotated[User, Depends(get_current_superuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    await service.delete_category(session, category_id, current_user, post_type)
    return None


# ========================================
# 动态路由 - 必须放在最后
# ========================================

from app.posts import cruds, utils
from fastapi_pagination import Page


@router.get(
    "/{post_type}/categories",
    response_model=Page[CategoryResponse],
    summary="获取指定板块的分类列表",
    description=LIST_CATEGORIES_BY_TYPE_DOC,
)
async def list_categories_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    include_inactive: Annotated[
        bool, Query(description="是否包含未启用的分类")
    ] = False,
):
    is_active = None if include_inactive else True
    query = utils.build_categories_query(post_type, is_active=is_active)
    return await cruds.paginate_query(session, query)
