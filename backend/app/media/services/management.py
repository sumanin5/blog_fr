"""
文件管理服务

负责文件的更新、删除等管理功能。
"""

import logging
from pathlib import Path
from uuid import UUID

from app.core.config import settings
from app.media import crud
from app.media.model import MediaFile
from app.media.schemas import MediaFileUpdate
from app.media.services._permissions import check_file_ownership
from app.media.utils import cleanup_all_thumbnails, delete_file_from_disk
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


# ==========================================
# 文件更新相关函数
# ==========================================


async def update_media_file_info(
    session: AsyncSession,
    file_id: UUID,
    update_data: MediaFileUpdate,
    current_user_id: UUID,
    is_superadmin: bool = False,
) -> MediaFile:
    """更新媒体文件记录（带细粒度权限检查）

    Args:
        session: 数据库会话
        file_id: 文件ID
        update_data: 更新数据
        current_user_id: 当前用户ID
        is_superadmin: 是否是超级管理员

    Returns:
        MediaFile: 更新后的媒体文件对象

    Raises:
        MediaFileNotFoundError: 文件不存在
        InsufficientPermissionsError: 权限不足（非所有者且非超级管理员）
    """
    media_file = await crud.get_media_file(session, file_id)
    media_file = check_file_ownership(
        media_file, current_user_id, is_superadmin, "修改"
    )

    updated_file = await crud.update_media_file(session, media_file, update_data)
    logger.info(f"成功更新媒体文件信息: {media_file.id} by user {current_user_id}")
    return updated_file


async def toggle_file_publicity(
    session: AsyncSession,
    file_id: UUID,
    user_id: UUID,
    is_public: bool,
    is_superadmin: bool = False,
) -> MediaFile:
    """切换文件的公开状态（带细粒度权限检查）

    Args:
        session: 数据库会话
        file_id: 文件ID
        user_id: 当前用户ID
        is_public: 新的公开状态
        is_superadmin: 是否是超级管理员

    Returns:
        更新后的MediaFile对象

    Raises:
        MediaFileNotFoundError: 文件不存在
        InsufficientPermissionsError: 权限不足（非所有者且非超级管理员）
    """
    media_file = await crud.get_media_file(session, file_id)
    media_file = check_file_ownership(media_file, user_id, is_superadmin, "修改")

    update_data = MediaFileUpdate(is_public=is_public)
    updated_file = await crud.update_media_file(session, media_file, update_data)

    logger.info(f"文件 {file_id} 公开状态已更新为: {is_public} by user {user_id}")
    return updated_file


# ==========================================
# 文件删除相关函数
# ==========================================


async def delete_media_file(
    session: AsyncSession,
    file_id: UUID,
    current_user_id: UUID,
    is_superadmin: bool = False,
) -> None:
    """删除媒体文件及其缩略图（带细粒度权限检查）

    Args:
        session: 数据库会话
        file_id: 文件ID
        current_user_id: 当前用户ID
        is_superadmin: 是否是超级管理员

    Raises:
        MediaFileNotFoundError: 文件不存在
        InsufficientPermissionsError: 权限不足（非所有者且非超级管理员）
    """
    media_file = await crud.get_media_file(session, file_id)
    media_file = check_file_ownership(
        media_file, current_user_id, is_superadmin, "删除"
    )

    # 1. 删除主文件
    main_file_path = Path(settings.MEDIA_ROOT) / media_file.file_path
    await delete_file_from_disk(str(main_file_path))

    # 2. 删除缩略图
    if media_file.thumbnails:
        await cleanup_all_thumbnails(media_file.thumbnails, settings.MEDIA_ROOT)

    # 3. 删除数据库记录
    await crud.delete_media_file(session, media_file)

    logger.info(
        f"成功删除媒体文件: {media_file.original_filename} by user {current_user_id}"
    )


async def batch_delete_media_files(
    file_ids: list[UUID],
    session: AsyncSession,
    current_user_id: UUID,
    is_superadmin: bool = False,
) -> int:
    """批量删除媒体文件（带权限检查）

    Args:
        file_ids: 文件ID列表
        session: 数据库会话
        current_user_id: 当前用户ID
        is_superadmin: 是否是超级管理员

    Returns:
        int: 成功删除的文件数量

    Raises:
        InsufficientPermissionsError: 如果有任何文件无权删除

    注意：
        - 会先检查所有文件的权限，如果有任何文件无权删除，整个操作会失败
        - 权限检查通过后，会批量删除所有文件
        - 删除操作是原子性的（全部成功或全部失败）
    """
    # 1. 一次性查询所有文件
    media_files = await crud.get_media_files_by_ids(session, file_ids)

    # 2. 权限检查：确保所有文件都有权删除
    for media_file in media_files:
        check_file_ownership(media_file, current_user_id, is_superadmin, "删除")

    # 3. 删除所有文件
    deleted_count = 0
    for media_file in media_files:
        # 删除磁盘文件
        main_file_path = Path(settings.MEDIA_ROOT) / media_file.file_path
        await delete_file_from_disk(str(main_file_path))

        # 删除缩略图
        if media_file.thumbnails:
            await cleanup_all_thumbnails(media_file.thumbnails, settings.MEDIA_ROOT)

        # 标记数据库删除
        await session.delete(media_file)
        deleted_count += 1

    # 4. 一次性提交所有更改
    if deleted_count > 0:
        await session.commit()

    logger.info(
        f"批量删除完成，共删除 {deleted_count} 个文件 by user {current_user_id}"
    )
    return deleted_count
