import logging
import shutil
from pathlib import Path
from typing import Optional
from uuid import UUID

from app.core.config import settings
from app.core.exceptions import InsufficientPermissionsError
from app.git_ops.components.writer.path_calculator import POST_TYPE_DIR_MAP
from app.posts import cruds as crud
from app.posts.exceptions import (
    CategoryNotFoundError,
    SlugConflictError,
)
from app.posts.model import Category, Post, PostType
from app.posts.schemas import CategoryCreate, CategoryUpdate
from app.users.model import User
from sqlmodel import select
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

    # [Sync] 物理副作用：尝试创建空目录（可选，增强体验）
    try:
        base_dir = Path(settings.CONTENT_DIR)

        # 映射目录名 (e.g. article -> articles)
        raw_type = db_category.post_type.value
        type_folder = POST_TYPE_DIR_MAP.get(raw_type, raw_type)

        category_dir = base_dir / type_folder / db_category.slug
        if not category_dir.exists():
            category_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Initialized physical directory for category: {category_dir}")
    except Exception as e:
        logger.warning(f"Failed to create physical directory for category: {e}")
        # 不阻断主流程

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
    """
    # 权限检查：只有超级管理员可以更新分类
    if not current_user.is_superadmin:
        raise InsufficientPermissionsError("只有超级管理员可以更新分类")

    # 获取分类
    db_category = await crud.get_category_by_id(session, category_id, post_type)
    if not db_category:
        raise CategoryNotFoundError()

    # 捕获旧状态，用于物理同步
    old_slug = db_category.slug
    old_post_type = db_category.post_type

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

    # 立即提交以确保 DB 状态一致，然后再处理物理文件
    await session.commit()
    await session.refresh(db_category)

    # [Sync] 物理副作用：如果要改名 (Slug 变更)，执行目录移动
    new_slug = db_category.slug
    if old_slug != new_slug:
        try:
            base_dir = Path(settings.CONTENT_DIR)

            # 映射目录名
            raw_type = old_post_type.value
            type_folder = POST_TYPE_DIR_MAP.get(raw_type, raw_type)

            # 路径结构: content_dir / type_folder / slug
            old_path = base_dir / type_folder / old_slug
            new_path = base_dir / type_folder / new_slug

            # 1. 物理重命名 (如果旧目录存在)
            if old_path.exists():
                if new_path.exists():
                    logger.warning(
                        f"Target directory {new_path} already exists, merging..."
                    )
                    # 如果目标已存在，shutil.move 会把目录移进去，这可能不是我们想要的。
                    pass
                else:
                    shutil.move(str(old_path), str(new_path))
                    logger.info(f"Renamed physical directory: {old_path} -> {new_path}")

                    # 2. 批量修补数据库中 Post 的 source_path
                    # 旧前缀: type_folder/old_slug/
                    # 新前缀: type_folder/new_slug/
                    old_prefix = f"{type_folder}/{old_slug}/"
                    new_prefix = f"{type_folder}/{new_slug}/"

                    # 查找所有属于该分类且 source_path 匹配旧前缀的文章
                    stmt = select(Post).where(
                        Post.category_id == category_id,
                        Post.source_path.startswith(old_prefix),  # type: ignore
                    )
                    result = await session.execute(stmt)
                    posts_to_update = result.scalars().all()

                    for post in posts_to_update:
                        if post.source_path:
                            post.source_path = post.source_path.replace(
                                old_prefix, new_prefix, 1
                            )
                            session.add(post)
                            logger.info(f"Updated post path: {post.source_path}")

                    await session.commit()
                    logger.info(f"Updated source_path for {len(posts_to_update)} posts")

        except Exception as e:
            logger.error(
                f"Failed to sync physical directory rename: {e}", exc_info=True
            )
            # 物理操作失败不回滚数据库，这也是为什么这是 Side Effect

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

    # 捕获信息用于物理删除
    target_slug = db_category.slug
    target_type = db_category.post_type

    # 删除分类
    await crud.delete_category(session, db_category)
    await session.commit()

    # [Sync] 物理副作用：尝试删除空目录
    try:
        base_dir = Path(settings.CONTENT_DIR)

        # 映射目录名
        raw_type = target_type.value
        type_folder = POST_TYPE_DIR_MAP.get(raw_type, raw_type)

        category_dir = base_dir / type_folder / target_slug

        # 只有目录存在且为空时才删除，防止误删还没来得及同步到 DB 的文件
        if category_dir.exists() and category_dir.is_dir():
            if not any(category_dir.iterdir()):  # 检查是否为空
                category_dir.rmdir()
                logger.info(f"Removed empty physical directory: {category_dir}")
            else:
                logger.warning(f"Skipped deleting non-empty directory: {category_dir}")
    except Exception as e:
        logger.warning(f"Failed to cleanup physical directory: {e}")

    logger.info(
        f"分类已删除: {db_category.name} (ID: {category_id}) by user {current_user.id}"
    )
