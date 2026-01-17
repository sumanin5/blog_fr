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

from typing import Annotated, List, Optional
from uuid import UUID

from app.core.db import get_async_session
from app.posts import crud, service, utils
from app.posts.dependencies import PostFilterParams
from app.posts.model import PostStatus, PostType
from app.posts.schema import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    PostCreate,
    PostDetailResponse,
    PostPreviewRequest,
    PostPreviewResponse,
    PostShortResponse,
    PostUpdate,
    TagMergeRequest,
    TagResponse,
    TagUpdate,
)
from app.users.dependencies import (
    get_current_active_user,
    get_current_superuser,
    get_optional_current_user,
)
from app.users.model import User
from fastapi import APIRouter, Depends, Path, Query, status
from fastapi_pagination import Page, Params
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


@router.post("/preview", response_model=PostPreviewResponse, summary="文章实时预览")
async def preview_post(request: PostPreviewRequest):
    """预览 MDX 内容（转换 Markdown -> HTML）"""
    return utils.PostProcessor(request.content_mdx).process()


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


@router.get(
    "/me",
    response_model=Page[PostShortResponse],
    summary="获取当前用户的文章列表",
)
async def get_my_posts(
    current_user: Annotated[User, Depends(get_current_active_user)],
    filters: Annotated[PostFilterParams, Depends()],
    params: Annotated[Params, Depends()],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """获取当前用户的所有文章（包括草稿）

    示例：
    - GET /posts/me - 我的所有文章
    - GET /posts/me?status=draft - 我的草稿
    - GET /posts/me?status=published - 我的已发布文章

    注意：需要登录才能访问
    """
    query = utils.build_posts_query(
        post_type=filters.post_type,  # 可以筛选类型
        status=filters.status,  # 可以筛选状态
        author_id=current_user.id,  # 只显示当前用户的
        category_id=filters.category_id,
        tag_id=filters.tag_id,
        is_featured=filters.is_featured,
        search_query=filters.search,
    )
    return await crud.paginate_query(session, query, params)


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
    params: Annotated[Params, Depends()],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """获取指定板块的文章列表（自动分页）

    示例：
    - GET /posts/article?page=1&size=20 - 文章列表
    - GET /posts/idea?page=1&size=20 - 想法列表
    - GET /posts/article?status=draft - 草稿列表（需要登录）
    """
    query = utils.build_posts_query(
        post_type=post_type,
        category_id=filters.category_id,
        tag_id=filters.tag_id,
        author_id=filters.author_id,
        is_featured=filters.is_featured,
        search_query=filters.search,
        status=filters.status
        if filters.status
        else PostStatus.PUBLISHED,  # 默认只显示已发布
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
    include_inactive: bool = False,
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
):
    """获取指定板块的标签列表（自动分页）

    示例：
    - GET /posts/article/tags - 文章标签
    - GET /posts/idea/tags - 想法标签
    """
    query = utils.build_tags_query(post_type)
    return await crud.paginate_query(session, query)


@router.get(
    "/{post_type}/{post_id:uuid}",
    response_model=PostDetailResponse,
    summary="通过ID获取文章详情",
)
async def get_post_by_id(
    post_type: Annotated[PostType, Path(description="板块类型")],
    post_id: UUID,
    include_mdx: bool = Query(False, description="是否包含原始 MDX 内容（用于编辑）"),
    session: Annotated[AsyncSession, Depends(get_async_session)] = None,
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)] = None,
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
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)] = None,
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


# ========================================
# 互动接口 (无需认证)
# ========================================


@router.post(
    "/{post_type}/{post_id}/like",
    response_model=dict,
    summary="点赞文章",
)
async def like_post(
    post_id: UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """点赞文章 (+1)"""
    count = await service.update_post_like(session, post_id, increment=True)
    return {"like_count": count}


@router.delete(
    "/{post_type}/{post_id}/like",
    response_model=dict,
    summary="取消点赞",
)
async def unlike_post(
    post_id: UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """取消点赞 (-1)"""
    count = await service.update_post_like(session, post_id, increment=False)
    return {"like_count": count}


@router.post(
    "/{post_type}/{post_id}/bookmark",
    response_model=dict,
    summary="收藏文章",
)
async def bookmark_post(
    post_id: UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """收藏文章 (+1)"""
    count = await service.update_post_bookmark(session, post_id, increment=True)
    return {"bookmark_count": count}


@router.delete(
    "/{post_type}/{post_id}/bookmark",
    response_model=dict,
    summary="取消收藏",
)
async def unbookmark_post(
    post_id: UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """取消收藏 (-1)"""
    count = await service.update_post_bookmark(session, post_id, increment=False)
    return {"bookmark_count": count}


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
