import logging
from typing import Optional
from uuid import UUID

from app.core.exceptions import InsufficientPermissionsError
from app.posts import cruds as crud
from app.posts.exceptions import (
    CategoryNotFoundError,
    SlugConflictError,
)
from app.posts.model import Category, PostType
from app.posts.schemas import CategoryCreate, CategoryUpdate
from app.users.model import User
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


async def create_category(
    session: AsyncSession, category_in: CategoryCreate, current_user: User
) -> Category:
    """创建分类（仅超级管理员）

    Args:
        session: 数据库会话
        category_in: 分类创建数据
        current_user: 当前用户

    Returns:
        创建的分类对象

    Raises:
        InsufficientPermissionsError: 非超级管理员
        SlugConflictError: Slug 已存在
    """
    # 权限检查：只有超级管理员可以创建分类
    if not current_user.is_superadmin:
        raise InsufficientPermissionsError("只有超级管理员可以创建分类")

    # 检查 slug 是否已存在（同一 post_type 下）
    existing = await crud.get_category_by_slug(
        session, category_in.slug, category_in.post_type
    )
    if existing:
        raise SlugConflictError(
            f"Slug '{category_in.slug}' 在 {category_in.post_type} 板块下已存在"
        )

    # 创建分类
    db_category = Category(**category_in.model_dump())
    db_category = await crud.create_category(session, db_category)
    await session.commit()
    await session.refresh(db_category)

    logger.info(
        f"分类创建成功: {db_category.name} (ID: {db_category.id}) by user {current_user.id}"
    )
    return db_category


async def update_category(
    session: AsyncSession,
    category_id: UUID,
    category_in: CategoryUpdate,
    current_user: User,
    post_type: Optional[PostType] = None,
) -> Category:
    """更新分类（仅超级管理员）

    Args:
        session: 数据库会话
        category_id: 分类ID
        category_in: 更新数据
        current_user: 当前用户
        post_type: 可选的板块类型验证

    Returns:
        更新后的分类对象

    Raises:
        InsufficientPermissionsError: 非超级管理员
        CategoryNotFoundError: 分类不存在
        SlugConflictError: Slug 冲突
    """
    # 权限检查：只有超级管理员可以更新分类
    if not current_user.is_superadmin:
        raise InsufficientPermissionsError("只有超级管理员可以更新分类")

    # 获取分类
    db_category = await crud.get_category_by_id(session, category_id, post_type)
    if not db_category:
        raise CategoryNotFoundError()

    update_data = category_in.model_dump(exclude_unset=True)

    # 如果要更新 slug，检查是否冲突
    if "slug" in update_data and update_data["slug"] != db_category.slug:
        check_post_type = update_data.get("post_type", db_category.post_type)
        existing = await crud.get_category_by_slug(
            session, update_data["slug"], check_post_type
        )
        if existing and existing.id != category_id:
            raise SlugConflictError(
                f"Slug '{update_data['slug']}' 在 {check_post_type} 板块下已存在"
            )

    # 更新分类
    db_category = await crud.update_category(session, db_category, update_data)
    await session.commit()
    await session.refresh(db_category)

    logger.info(f"分类更新成功: {db_category.name} by user {current_user.id}")
    return db_category


async def delete_category(
    session: AsyncSession,
    category_id: UUID,
    current_user: User,
    post_type: Optional[PostType] = None,
) -> None:
    """删除分类（仅超级管理员）

    Args:
        session: 数据库会话
        category_id: 分类ID
        current_user: 当前用户
        post_type: 可选的板块类型验证

    Raises:
        InsufficientPermissionsError: 非超级管理员
        CategoryNotFoundError: 分类不存在
    """
    # 权限检查：只有超级管理员可以删除分类
    if not current_user.is_superadmin:
        raise InsufficientPermissionsError("只有超级管理员可以删除分类")

    # 获取分类
    db_category = await crud.get_category_by_id(session, category_id, post_type)
    if not db_category:
        raise CategoryNotFoundError()

    # 删除分类
    await crud.delete_category(session, db_category)
    await session.commit()

    logger.info(
        f"分类已删除: {db_category.name} (ID: {category_id}) by user {current_user.id}"
    )
