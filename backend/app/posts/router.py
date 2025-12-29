"""
文章模块路由 (Router)

提供文章、分类和标签的 API 接口
"""

from typing import Annotated, List

from app.core.db import get_async_session
from app.posts import crud, service
from app.posts.dependencies import (
    PostFilterParams,
    check_post_owner_or_admin,
    get_post_by_slug_dep,
)
from app.posts.model import Post, PostStatus, PostType
from app.posts.schema import (
    CategoryResponse,
    PostCreate,
    PostDetailResponse,
    PostListResponse,
    PostShortResponse,
    PostUpdate,
    TagResponse,
)
from app.users.dependencies import get_current_active_user
from app.users.model import User
from fastapi import APIRouter, Depends, status
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter(prefix="/posts")


# ========================================
# 公开接口 (无需认证)
# ========================================


@router.get("", response_model=PostListResponse, summary="获取文章列表")
async def list_posts(
    filters: Annotated[PostFilterParams, Depends()],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """获取已发布的文章列表 (带板块隔离)"""
    items = await crud.get_posts(
        session,
        post_type=filters.post_type,
        category_id=filters.category_id,
        tag_id=filters.tag_id,
        author_id=filters.author_id,
        is_featured=filters.is_featured,
        search_query=filters.search,
        limit=filters.limit,
        offset=filters.offset,
        status=PostStatus.PUBLISHED,
    )
    # 计算总数 (简单实现)
    total = len(items)  # 实际应有单独的 count 查询

    return PostListResponse(
        items=[PostShortResponse.model_validate(i) for i in items],
        total=total,
        limit=filters.limit,
        offset=filters.offset,
    )


@router.get("/detail/{slug}", response_model=PostDetailResponse, summary="获取文章详情")
async def get_post_detail(
    post: Annotated[Post, Depends(get_post_by_slug_dep)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """根据 Slug 获取文章详情并增加浏览量"""
    # 异步增加浏览量 (不影响主响应速度)
    await crud.increment_view_count(session, post.id)
    return PostDetailResponse.model_validate(post)


@router.get("/categories", response_model=List[CategoryResponse], summary="分类列表")
async def list_categories(
    post_type: PostType,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """获取指定板块下的所有激活分类"""
    return await crud.get_categories(session, post_type)


@router.get("/tags", response_model=List[TagResponse], summary="标签云")
async def list_tags(
    post_type: PostType,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """获取指定板块下有文章关联的标签列表"""
    return await crud.get_tags_by_type(session, post_type)


# ========================================
# 创作接口 (需要认证)
# ========================================


@router.post(
    "",
    response_model=PostDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建文章",
)
async def create_post(
    post_in: PostCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """创建新文章 (自动解析 MDX)"""
    return await service.create_post(session, post_in, current_user.id)


@router.patch("/{post_id}", response_model=PostDetailResponse, summary="更新文章")
async def update_post(
    post_in: PostUpdate,
    db_post: Annotated[Post, Depends(check_post_owner_or_admin)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """更新文章内容"""
    return await service.update_post(session, db_post, post_in)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT, summary="删除文章")
async def delete_post(
    db_post: Annotated[Post, Depends(check_post_owner_or_admin)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """删除文章"""
    await service.delete_post(session, db_post)
    return None
