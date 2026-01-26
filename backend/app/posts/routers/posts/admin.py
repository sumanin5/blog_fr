from typing import Annotated

from app.core.db import get_async_session
from app.posts import cruds, utils
from app.posts.dependencies import PostFilterParams
from app.posts.model import PostType
from app.posts.schemas import (
    PostShortResponse,
)
from app.users.dependencies import get_current_active_user
from app.users.model import User
from fastapi import APIRouter, Depends, Path
from fastapi_pagination import Page, Params
from sqlmodel.ext.asyncio.session import AsyncSession

from .doc import (
    GET_MY_POSTS_DOC,
    LIST_ALL_POSTS_ADMIN_DOC,
    LIST_POSTS_BY_TYPE_ADMIN_DOC,
)

router = APIRouter(tags=["Posts - Articles"])

# ========================================
# 文章管理接口 (需要登录) - 放在最前面
# ========================================


@router.get(
    "/{post_type}/admin/posts",
    response_model=Page[PostShortResponse],
    summary="获取指定板块的文章列表（管理后台）",
    description=LIST_POSTS_BY_TYPE_ADMIN_DOC,
)
async def list_posts_by_type_admin(
    post_type: Annotated[PostType, Path(description="板块类型")],
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    filters: Annotated[PostFilterParams, Depends()],
    params: Annotated[Params, Depends()],
):
    if not current_user.is_superadmin:
        filters.author_id = current_user.id

    query = utils.build_posts_query(
        post_type=post_type,  # 限制板块类型
        status=filters.status,  # 允许筛选状态
        category_id=filters.category_id,
        tag_id=filters.tag_id,
        author_id=filters.author_id,
        is_featured=filters.is_featured,
        search_query=filters.search,
    )
    return await cruds.paginate_query(session, query, params)


@router.get(
    "/admin/posts",
    response_model=Page[PostShortResponse],
    summary="获取所有文章列表（管理后台，跨板块）",
    description=LIST_ALL_POSTS_ADMIN_DOC,
)
async def list_all_posts_admin(
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    filters: Annotated[PostFilterParams, Depends()],
    params: Annotated[Params, Depends()],
):
    if not current_user.is_superadmin:
        filters.author_id = current_user.id

    query = utils.build_posts_query(
        post_type=None,  # 不限制类型，显示所有板块
        status=filters.status,  # 使用 filters.status (None 时查询构建器会默认处理，我们需要修改 query_builder)
        category_id=filters.category_id,
        tag_id=filters.tag_id,
        author_id=filters.author_id,
        is_featured=filters.is_featured,
        search_query=filters.search,
    )
    return await cruds.paginate_query(session, query, params)


@router.get(
    "/me",
    response_model=Page[PostShortResponse],
    summary="获取当前用户的文章列表",
    description=GET_MY_POSTS_DOC,
)
async def get_my_posts(
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    filters: Annotated[PostFilterParams, Depends()],
    params: Annotated[Params, Depends()],
):
    query = utils.build_posts_query(
        post_type=None,  # 不筛选类型，显示所有板块的文章
        status=filters.status,
        author_id=current_user.id,  # 只显示当前用户的
        category_id=filters.category_id,
        tag_id=filters.tag_id,
        is_featured=filters.is_featured,
        search_query=filters.search,
    )
    return await cruds.paginate_query(session, query, params)
