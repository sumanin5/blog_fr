"""
文章模块路由 (Router)

提供文章、分类和标签的 API 接口

权限设计：
- 路由层：粗粒度权限（是否登录、是否管理员）
- Service层：细粒度权限（是否是作者，超级管理员绕过）

路由设计：
- 动态板块路由：/posts/{post_type}
- 支持任意 PostType 枚举值
- 前端可动态构建菜单
"""

from typing import Annotated, List
from uuid import UUID

from app.core.db import get_async_session
from app.posts import crud, service, utils
from app.posts.dependencies import PostFilterParams
from app.posts.model import PostStatus, PostType
from app.posts.schema import (
    CategoryResponse,
    PostCreate,
    PostDetailResponse,
    PostShortResponse,
    PostUpdate,
    TagResponse,
)
from app.users.dependencies import get_current_active_user
from app.users.model import User
from fastapi import APIRouter, Depends, Path, status
from fastapi_pagination import Page
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter(prefix="/posts")


# ========================================
# 元数据接口（构建菜单）
# ========================================


@router.get("/types", response_model=List[dict], summary="获取所有板块类型")
async def get_post_types():
    """获取所有板块类型（用于前端构建菜单）

    返回示例：
    [
        {"value": "article", "label": "Article"},
        {"value": "idea", "label": "Idea"}
    ]
    """
    return [{"value": pt.value, "label": pt.value.title()} for pt in PostType]


# ========================================
# 动态板块接口（公开）
# ========================================


@router.get(
    "/{post_type}",
    response_model=Page[PostShortResponse],
    summary="获取指定板块的文章列表",
)
async def list_posts_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    filters: Annotated[PostFilterParams, Depends()],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """获取指定板块的文章列表（自动分页）

    示例：
    - GET /posts/article?page=1&size=20 - 文章列表
    - GET /posts/idea?page=1&size=20 - 想法列表
    """
    query = utils.build_posts_query(
        post_type=post_type,
        category_id=filters.category_id,
        tag_id=filters.tag_id,
        author_id=filters.author_id,
        is_featured=filters.is_featured,
        search_query=filters.search,
        status=PostStatus.PUBLISHED,
    )
    return await crud.paginate_query(session, query)


@router.get(
    "/{post_type}/categories",
    response_model=Page[CategoryResponse],
    summary="获取指定板块的分类列表",
)
async def list_categories_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """获取指定板块的分类列表（自动分页）

    示例：
    - GET /posts/article/categories - 文章分类
    - GET /posts/idea/categories - 想法分类
    """
    query = utils.build_categories_query(post_type)
    return await crud.paginate_query(session, query)


@router.get(
    "/{post_type}/tags",
    response_model=Page[TagResponse],
    summary="获取指定板块的标签列表",
)
async def list_tags_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """获取指定板块的标签列表（自动分页）

    示例：
    - GET /posts/article/tags - 文章标签
    - GET /posts/idea/tags - 想法标签
    """
    query = utils.build_tags_query(post_type)
    return await crud.paginate_query(session, query)


@router.get(
    "/{post_type}/{slug}", response_model=PostDetailResponse, summary="获取文章详情"
)
async def get_post_detail_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    slug: str,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """根据 Slug 获取文章详情并增加浏览量（公开接口）

    示例：
    - GET /posts/article/my-post-slug
    - GET /posts/idea/my-idea-slug
    """
    from app.posts.exceptions import PostNotFoundError

    post = await crud.get_post_by_slug(session, slug)
    if not post or post.post_type != post_type:
        raise PostNotFoundError()

    # 异步增加浏览量
    await crud.increment_view_count(session, post.id)
    return PostDetailResponse.model_validate(post)


# ========================================
# 创作接口 (需要认证)
# ========================================


@router.post(
    "/{post_type}",
    response_model=PostDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建文章",
)
async def create_post_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    post_in: PostCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """创建新文章（需要登录）

    示例：
    - POST /posts/article - 创建文章
    - POST /posts/idea - 创建想法
    """
    # 确保 post_type 匹配
    post_in.post_type = post_type
    return await service.create_post(session, post_in, current_user.id)


@router.patch(
    "/{post_type}/{post_id}", response_model=PostDetailResponse, summary="更新文章"
)
async def update_post_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    post_id: UUID,
    post_in: PostUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """更新文章（需要是作者或超级管理员）

    示例：
    - PATCH /posts/article/{post_id}
    - PATCH /posts/idea/{post_id}
    """
    return await service.update_post(session, post_id, post_in, current_user)


@router.delete(
    "/{post_type}/{post_id}", status_code=status.HTTP_204_NO_CONTENT, summary="删除文章"
)
async def delete_post_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    post_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """删除文章（需要是作者或超级管理员）

    示例：
    - DELETE /posts/article/{post_id}
    - DELETE /posts/idea/{post_id}
    """
    await service.delete_post(session, post_id, current_user)
    return None
