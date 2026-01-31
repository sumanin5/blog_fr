from typing import Annotated
from uuid import UUID

from app.core.db import get_async_session
from app.git_ops.background_tasks import run_background_commit
from app.posts import services as service
from app.posts.model import PostType
from app.posts.schemas import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
)
from app.users.dependencies import get_current_superuser
from app.users.model import User
from fastapi import APIRouter, BackgroundTasks, Depends, Path, Query, status
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
    background_tasks: BackgroundTasks,
):
    """创建新分类（仅超级管理员）

    示例：
    - POST /posts/article/categories - 创建文章分类
    - POST /posts/idea/categories - 创建想法分类
    """
    # 确保 post_type 匹配
    category_in.post_type = post_type
    category = await service.create_category(session, category_in, current_user)

    # 触发自动提交到 Git（强制提交，因为分类 index.md 已被修改）
    background_tasks.add_task(
        run_background_commit,
        message=f"feat: create category '{category.name}' ({category.slug})",
        force_commit=True,
    )

    return category


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
    background_tasks: BackgroundTasks,
):
    """更新分类（仅超级管理员）

    示例：
    - PATCH /posts/article/categories/{category_id}
    - PATCH /posts/idea/categories/{category_id}
    """
    category = await service.update_category(
        session, category_id, category_in, current_user, post_type
    )

    # 触发自动提交到 Git（强制提交，因为分类 index.md 已被修改）
    background_tasks.add_task(
        run_background_commit,
        message=f"chore: update category '{category.name}' ({category.slug})",
        force_commit=True,
    )

    return category


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
    background_tasks: BackgroundTasks,
):
    # 先获取分类信息（用于提交信息）
    from app.posts import cruds as category_crud

    category = await category_crud.get_category_by_id(session, category_id, post_type)
    category_name = category.name if category else str(category_id)
    category_slug = category.slug if category else "unknown"

    await service.delete_category(session, category_id, current_user, post_type)

    # 触发自动提交到 Git（强制提交，因为分类 index.md 已被删除）
    background_tasks.add_task(
        run_background_commit,
        message=f"chore: delete category '{category_name}' ({category_slug})",
        force_commit=True,
    )

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
    is_featured: Annotated[bool | None, Query(description="是否只显示推荐分类")] = None,
):
    is_active = None if include_inactive else True
    query = utils.build_categories_query(
        post_type, is_active=is_active, is_featured=is_featured
    )

    # 1. 基础分页查询
    page_result = await cruds.paginate_query(session, query)

    # 2. 聚合统计文章数量
    if page_result.items:
        from app.posts.model import Post, PostStatus
        from sqlalchemy import func, select

        category_ids = [c.id for c in page_result.items]

        # 统计每个分类下已发布的文章数
        count_stmt = (
            select(Post.category_id, func.count(Post.id))
            .where(Post.category_id.in_(category_ids))
            .where(Post.status == PostStatus.PUBLISHED)
            .group_by(Post.category_id)
        )

        count_result = await session.exec(count_stmt)
        count_map = {row[0]: row[1] for row in count_result.all()}

        # 3. 填充 post_count 并转换为 Response 模型
        new_items = []
        for category in page_result.items:
            # model_validate 会处理 from_attributes=True
            resp = CategoryResponse.model_validate(category)
            resp.post_count = count_map.get(category.id, 0)
            new_items.append(resp)

        page_result.items = new_items

    return page_result
