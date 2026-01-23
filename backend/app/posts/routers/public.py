from typing import Annotated, List, Optional
from uuid import UUID

from app.core.db import get_async_session
from app.posts import crud, service, utils
from app.posts.dependencies import PostFilterParams
from app.posts.model import PostStatus, PostType
from app.posts.schema import (
    CategoryResponse,
    PostDetailResponse,
    PostShortResponse,
    PostTypeResponse,
    TagResponse,
)
from app.users.dependencies import get_optional_current_user
from app.users.model import User
from fastapi import APIRouter, Depends, Path, Query
from fastapi_pagination import Page, Params
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter()

# ========================================
# 元数据接口（构建菜单）
# ========================================


@router.get("/types", response_model=List[PostTypeResponse], summary="获取所有板块类型")
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
    post_type: Annotated[PostType, Path(description="文章类型")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    filters: Annotated[PostFilterParams, Depends()],
    params: Annotated[Params, Depends()],
):
    """获取指定板块的文章列表（自动分页）

    公开接口，只显示已发布的文章。

    示例：
    - GET /posts/article?page=1&size=20 - 文章列表
    - GET /posts/idea?page=1&size=20 - 想法列表
    - GET /posts/article?category_id=xxx - 按分类筛选
    """
    query = utils.build_posts_query(
        post_type=post_type,
        category_id=filters.category_id,
        tag_id=filters.tag_id,
        author_id=filters.author_id,
        is_featured=filters.is_featured,
        search_query=filters.search,
        status=PostStatus.PUBLISHED,  # 公开接口强制只显示已发布
    )
    return await crud.paginate_query(session, query, params)


@router.get(
    "/{post_type}/categories",
    response_model=Page[CategoryResponse],
    summary="获取指定板块的分类列表",
)
async def list_categories_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    include_inactive: Annotated[
        bool, Query(description="是否包含未启用的分类")
    ] = False,
):
    """获取指定板块的分类列表（自动分页）

    示例：
    - GET /posts/article/categories - 文章分类（仅启用）
    - GET /posts/article/categories?include_inactive=true - 所有分类
    """
    is_active = None if include_inactive else True
    query = utils.build_categories_query(post_type, is_active=is_active)
    return await crud.paginate_query(session, query)


@router.get(
    "/{post_type}/tags",
    response_model=Page[TagResponse],
    summary="获取指定板块的标签列表",
)
async def list_tags_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    params: Annotated[Params, Depends()],
):
    """获取指定板块的标签列表（自动分页）

    示例：
    - GET /posts/article/tags - 文章标签
    - GET /posts/idea/tags - 想法标签
    """
    from app.posts.cruds import tag as tag_crud

    return await tag_crud.list_tags_with_count(session, params, post_type=post_type)


@router.get(
    "/{post_type}/{post_id:uuid}",
    response_model=PostDetailResponse,
    summary="通过ID获取文章详情",
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
    """根据 UUID 获取文章详情并增加浏览量

    权限规则：
    - 已发布文章：任何人可访问（包括未登录）
    - 草稿文章：只有作者或超级管理员可访问

    查询参数：
    - include_mdx: 是否包含原始 MDX 内容（用于编辑页面）
      - False（默认）: 返回 AST（节省带宽）
      - True: 返回 MDX（用于编辑）

    示例：
    - GET /posts/article/{uuid}
    - GET /posts/article/{uuid}?include_mdx=true

    注意：使用 :uuid 路径转换器确保与 slug 路由不冲突
    """
    post = await service.get_post_detail(session, post_id, post_type, current_user)
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
)
async def get_post_by_slug(
    post_type: Annotated[PostType, Path(description="板块类型")],
    slug: str,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)],
):
    """根据 Slug 获取文章详情并增加浏览量

    权限规则：
    - 已发布文章：任何人可访问（包括未登录）
    - 草稿文章：只有作者或超级管理员可访问

    示例：
    - GET /posts/article/slug/my-post-slug
    - GET /posts/idea/slug/my-idea-slug

    注意：使用 /slug/ 前缀明确区分 UUID 和 Slug 路由
    """
    from app.posts.exceptions import PostNotFoundError

    # 先通过 slug 查找文章 ID
    post = await crud.get_post_by_slug(session, slug)
    if not post or post.post_type != post_type:
        raise PostNotFoundError()

    # 复用 service 层的权限检查逻辑
    post = await service.get_post_detail(session, post.id, post_type, current_user)
    return PostDetailResponse.model_validate(post)
