from typing import Annotated, List, Optional
from uuid import UUID

from app.core.db import get_async_session
from app.posts import cruds, services, utils
from app.posts.dependencies import PostFilterParams
from app.posts.model import PostStatus, PostType
from app.posts.schemas import (
    PostDetailResponse,
    PostShortResponse,
    PostTypeResponse,
)
from app.users.dependencies import get_optional_current_user
from app.users.model import User
from fastapi import APIRouter, Depends, Path, Query
from fastapi_pagination import Page, Params
from sqlmodel.ext.asyncio.session import AsyncSession

from .doc import (
    GET_POST_BY_ID_DOC,
    GET_POST_BY_SLUG_DOC,
    GET_POST_TYPES_DOC,
    LIST_POSTS_BY_TYPE_DOC,
)

router = APIRouter(tags=["Posts - Articles"])

# ========================================
# 元数据接口（构建菜单）
# ========================================


@router.get(
    "/types",
    response_model=List[PostTypeResponse],
    summary="获取所有板块类型",
    description=GET_POST_TYPES_DOC,
)
async def get_post_types():
    # 映射表可根据需要扩展，未来甚至可以存入数据库或配置中心
    display_names = {
        PostType.ARTICLES: "文章",
        PostType.IDEAS: "想法/随笔",
    }
    return [
        {"value": pt.value, "label": display_names.get(pt, pt.value.title())}
        for pt in PostType
    ]


# ========================================
# 动态板块接口（公开）
# ========================================


@router.get(
    "/{post_type}",
    response_model=Page[PostShortResponse],
    summary="获取指定板块的文章列表",
    description=LIST_POSTS_BY_TYPE_DOC,
)
async def list_posts_by_type(
    post_type: Annotated[PostType, Path(description="文章类型")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    filters: Annotated[PostFilterParams, Depends()],
    params: Annotated[Params, Depends()],
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)],
):
    # 确定文章状态过滤
    # 规则：
    # 1. 如果指定了 status 参数且用户已登录 → 使用指定的 status
    # 2. 如果指定了 status 参数但用户未登录 → 强制为 PUBLISHED
    # 3. 如果未指定 status 参数 → 强制为 PUBLISHED
    if filters.status and current_user:
        status_filter = filters.status
    else:
        status_filter = PostStatus.PUBLISHED

    query = utils.build_posts_query(
        post_type=post_type,
        category_id=filters.category_id,
        tag_id=filters.tag_id,
        author_id=filters.author_id or (current_user.id if current_user else None),
        is_featured=filters.is_featured,
        search_query=filters.search,
        status=status_filter,
    )
    return await cruds.paginate_query(session, query, params)


@router.get(
    "/{post_type}/{post_id:uuid}",
    response_model=PostDetailResponse,
    summary="通过ID获取文章详情",
    description=GET_POST_BY_ID_DOC,
)
async def get_post_by_id(
    post_type: Annotated[PostType, Path(description="板块类型")],
    post_id: UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)],
    include_mdx: Annotated[
        bool, Query(description="是否包含原始 MDX 内容（用于编辑）")
    ] = False,
):
    post = await services.get_post_detail(session, post_id, post_type, current_user)
    response = PostDetailResponse.model_validate(post)

    # 根据 include_mdx 参数手动清空不需要的字段
    if include_mdx:
        # 编辑模式：返回 MDX，清空 AST
        response.content_ast = None
    else:
        # 查看模式：根据 enable_jsx 决定
        if response.enable_jsx:
            # 使用 MDX，清空 AST
            response.content_ast = None
        else:
            # 使用 AST，清空 MDX
            response.content_mdx = None

    return response


@router.get(
    "/{post_type}/slug/{slug}",
    response_model=PostDetailResponse,
    summary="通过Slug获取文章详情",
    description=GET_POST_BY_SLUG_DOC,
)
async def get_post_by_slug(
    post_type: Annotated[PostType, Path(description="板块类型")],
    slug: str,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)],
):
    from app.posts.exceptions import PostNotFoundError

    # 先通过 slug 查找文章 ID
    post = await cruds.get_post_by_slug(session, slug)
    if not post or post.post_type != post_type:
        raise PostNotFoundError()

    # 复用 service 层的权限检查逻辑
    post = await services.get_post_detail(session, post.id, post_type, current_user)
    return PostDetailResponse.model_validate(post)
