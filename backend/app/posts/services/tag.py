import logging
from uuid import UUID

from app.core.exceptions import InsufficientPermissionsError
from app.posts import crud
from app.posts.exceptions import SlugConflictError, TagNotFoundError
from app.posts.schema import TagUpdate
from app.users.model import User
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


async def update_tag(
    session: AsyncSession, tag_id: UUID, tag_in: TagUpdate, current_user: User
) -> TagNotFoundError:
    """更新标签（仅超级管理员）

    用于统一标签命名、更新颜色等

    Args:
        session: 数据库会话
        tag_id: 标签ID
        tag_in: 更新数据
        current_user: 当前用户

    Returns:
        更新后的标签对象

    Raises:
        InsufficientPermissionsError: 非超级管理员
        TagNotFoundError: 标签不存在
        SlugConflictError: Slug 冲突
    """
    # 权限检查：只有超级管理员可以更新标签
    if not current_user.is_superadmin:
        raise InsufficientPermissionsError("只有超级管理员可以更新标签")

    # 获取标签
    db_tag = await crud.get_tag_by_id(session, tag_id)
    if not db_tag:
        raise TagNotFoundError()

    update_data = tag_in.model_dump(exclude_unset=True)

    # 如果要更新 slug，检查是否冲突
    if "slug" in update_data and update_data["slug"] != db_tag.slug:
        existing = await crud.get_tag_by_slug(session, update_data["slug"])
        if existing and existing.id != tag_id:
            raise SlugConflictError(f"Slug '{update_data['slug']}' 已存在")

    # 更新标签
    db_tag = await crud.update_tag(session, db_tag, update_data)
    await session.commit()
    await session.refresh(db_tag)

    logger.info(f"标签更新成功: {db_tag.name} by user {current_user.id}")
    return db_tag


async def delete_orphaned_tags(
    session: AsyncSession, current_user: User
) -> tuple[int, list[str]]:
    """删除孤立标签（仅超级管理员）

    删除没有任何文章关联的标签

    Args:
        session: 数据库会话
        current_user: 当前用户

    Returns:
        (deleted_count, deleted_tag_names)

    Raises:
        InsufficientPermissionsError: 非超级管理员
    """
    # 权限检查：只有超级管理员可以删除标签
    if not current_user.is_superadmin:
        raise InsufficientPermissionsError("只有超级管理员可以删除标签")

    # 获取孤立标签
    orphaned_tags = await crud.get_orphaned_tags(session)

    if not orphaned_tags:
        return (0, [])

    # 删除所有孤立标签
    deleted_names = [tag.name for tag in orphaned_tags]
    for tag in orphaned_tags:
        await crud.delete_tag(session, tag)

    await session.commit()

    logger.info(
        f"删除 {len(orphaned_tags)} 个孤立标签: {', '.join(deleted_names)} by user {current_user.id}"
    )
    return (len(orphaned_tags), deleted_names)


async def merge_tags(
    session: AsyncSession,
    source_tag_id: UUID,
    target_tag_id: UUID,
    current_user: User,
) -> TagNotFoundError:
    """合并标签（仅超级管理员）

    将 source_tag 的所有文章关联转移到 target_tag，然后删除 source_tag
    用于合并重复标签（如 "React.js" 和 "ReactJS"）

    Args:
        session: 数据库会话
        source_tag_id: 源标签ID（将被删除）
        target_tag_id: 目标标签ID（保留）
        current_user: 当前用户

    Returns:
        目标标签对象

    Raises:
        InsufficientPermissionsError: 非超级管理员
        TagNotFoundError: 标签不存在
    """
    # 权限检查：只有超级管理员可以合并标签
    if not current_user.is_superadmin:
        raise InsufficientPermissionsError("只有超级管理员可以合并标签")

    # 验证两个标签是否存在
    source_tag = await crud.get_tag_by_id(session, source_tag_id)
    target_tag = await crud.get_tag_by_id(session, target_tag_id)

    if not source_tag:
        raise TagNotFoundError(f"源标签不存在: {source_tag_id}")
    if not target_tag:
        raise TagNotFoundError(f"目标标签不存在: {target_tag_id}")

    if source_tag_id == target_tag_id:
        raise ValueError("源标签和目标标签不能相同")

    # 执行合并
    source_name = source_tag.name
    result_tag = await crud.merge_tags(session, source_tag_id, target_tag_id)
    await session.commit()
    await session.refresh(result_tag)

    logger.info(
        f"标签合并成功: '{source_name}' → '{result_tag.name}' by user {current_user.id}"
    )
    return result_tag
