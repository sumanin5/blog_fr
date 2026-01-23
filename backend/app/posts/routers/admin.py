from typing import Annotated
from uuid import UUID

from app.core.db import get_async_session
from app.posts import crud, service, utils
from app.posts.dependencies import PostFilterParams
from app.posts.model import PostType
from app.posts.schema import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    PostShortResponse,
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

router = APIRouter()

# ========================================
# 文章管理接口 (需要登录) - 放在最前面
# ========================================


@router.get(
    "/{post_type}/admin/posts",
    response_model=Page[PostShortResponse],
    summary="获取指定板块的文章列表（管理后台）",
)
async def list_posts_by_type_admin(
    post_type: Annotated[PostType, Path(description="板块类型")],
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    filters: Annotated[PostFilterParams, Depends()],
    params: Annotated[Params, Depends()],
):
    """获取指定板块的文章列表（管理后台）

    权限：
    - 超级管理员：可以查看所有文章（包括所有用户的草稿）
    - 普通用户：只能查看自己的文章

    支持筛选：
    - status: 文章状态（draft/published/archived）
    - category_id: 分类ID
    - tag_id: 标签ID
    - author_id: 作者ID（超级管理员可用）
    - is_featured: 是否推荐
    - search: 搜索关键词

    示例：
    - GET /posts/article/admin/posts - 所有文章（article 板块）
    - GET /posts/article/admin/posts?status=draft - 草稿列表
    - GET /posts/idea/admin/posts?author_id=xxx - 指定作者的想法（超级管理员）
    """
    # 权限控制：普通用户只能查看自己的文章
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
    return await crud.paginate_query(session, query, params)


@router.get(
    "/admin/posts",
    response_model=Page[PostShortResponse],
    summary="获取所有文章列表（管理后台，跨板块）",
)
async def list_all_posts_admin(
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    filters: Annotated[PostFilterParams, Depends()],
    params: Annotated[Params, Depends()],
):
    """获取所有文章列表（管理后台，跨板块）

    权限：
    - 超级管理员：可以查看所有文章（包括所有用户的草稿）
    - 普通用户：只能查看自己的文章

    支持筛选：
    - status: 文章状态（draft/published/archived）
    - category_id: 分类ID
    - tag_id: 标签ID
    - author_id: 作者ID（超级管理员可用）
    - is_featured: 是否推荐
    - search: 搜索关键词

    示例：
    - GET /posts/admin/posts - 所有板块的所有文章
    - GET /posts/admin/posts?status=draft - 所有板块的草稿列表
    - GET /posts/admin/posts?search=Python - 全局搜索

    注意：此接口返回 article 和 idea 混合的结果，适合全局搜索和管理
    """
    # 权限控制：普通用户只能查看自己的文章
    if not current_user.is_superadmin:
        filters.author_id = current_user.id

    query = utils.build_posts_query(
        post_type=None,  # 不限制类型，显示所有板块
        status=filters.status,  # 允许筛选状态
        category_id=filters.category_id,
        tag_id=filters.tag_id,
        author_id=filters.author_id,
        is_featured=filters.is_featured,
        search_query=filters.search,
    )
    return await crud.paginate_query(session, query, params)


# ========================================
# 标签管理接口 (需要超级管理员) - 防止 Admin 被视为 PostType，需放在动态路由前
# ========================================


@router.get("/admin/tags", response_model=Page[TagResponse], summary="获取所有标签")
async def list_tags(
    params: Annotated[Params, Depends()],
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    search: Annotated[
        str | None, Query(description="搜索关键词，支持标签名称模糊搜索")
    ] = None,
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
