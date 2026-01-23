"""
文件访问服务

负责文件访问权限检查和文件访问业务逻辑
"""

from pathlib import Path
from uuid import UUID

from app.media import cruds
from app.media.exceptions import MediaFileNotFoundError
from app.media.model import MediaFile
from app.media.services._permissions import check_file_access
from app.media.utils import path as path_utils
from app.users.model import User
from sqlmodel.ext.asyncio.session import AsyncSession


async def get_file_for_view(
    session: AsyncSession,
    file_id: UUID,
    current_user: User,
) -> tuple[Path, MediaFile]:
    """获取文件用于查看（检查权限 + 更新查看次数 + 返回路径）

    Args:
        session: 数据库会话
        file_id: 文件ID
        current_user: 当前用户

    Returns:
        tuple: (文件路径, 文件对象)

    Raises:
        MediaFileNotFoundError: 文件不存在
        InsufficientPermissionsError: 无权访问
    """
    from app.core.exceptions import InsufficientPermissionsError

    # 1. 获取文件
    media_file = await cruds.get_media_file(session, file_id)
    if not media_file:
        raise MediaFileNotFoundError(f"媒体文件不存在: {file_id}")

    # 2. 权限检查
    if not check_file_access(media_file, current_user):
        raise InsufficientPermissionsError("无权访问此文件")

    # 3. 更新查看次数
    await cruds.update_view_count(session, media_file)

    # 4. 获取文件路径
    file_path = path_utils.get_full_path(media_file.file_path)

    return file_path, media_file


async def get_file_for_download(
    session: AsyncSession,
    file_id: UUID,
    current_user: User,
) -> tuple[Path, MediaFile]:
    """获取文件用于下载（检查权限 + 更新下载次数 + 返回路径）

    Args:
        session: 数据库会话
        file_id: 文件ID
        current_user: 当前用户

    Returns:
        tuple: (文件路径, 文件对象)

    Raises:
        MediaFileNotFoundError: 文件不存在
        InsufficientPermissionsError: 无权访问
    """
    from app.core.exceptions import InsufficientPermissionsError

    # 1. 获取文件
    media_file = await cruds.get_media_file(session, file_id)
    if not media_file:
        raise MediaFileNotFoundError(f"媒体文件不存在: {file_id}")

    # 2. 权限检查
    if not check_file_access(media_file, current_user):
        raise InsufficientPermissionsError("无权访问此文件")

    # 3. 更新下载次数
    await cruds.update_download_count(session, media_file)

    # 4. 获取文件路径
    file_path = path_utils.get_full_path(media_file.file_path)

    return file_path, media_file


async def get_thumbnail_for_view(
    session: AsyncSession,
    file_id: UUID,
    size: str,
    current_user: User,
) -> tuple[Path, MediaFile]:
    """获取缩略图用于查看（检查权限 + 返回缩略图路径）

    Args:
        session: 数据库会话
        file_id: 文件ID
        size: 缩略图尺寸
        current_user: 当前用户

    Returns:
        tuple: (缩略图路径, 文件对象)

    Raises:
        MediaFileNotFoundError: 文件不存在或缩略图不存在
        InsufficientPermissionsError: 无权访问
    """
    from app.core.exceptions import InsufficientPermissionsError

    # 1. 获取文件
    media_file = await cruds.get_media_file(session, file_id)
    if not media_file:
        raise MediaFileNotFoundError(f"媒体文件不存在: {file_id}")

    # 2. 权限检查
    if not check_file_access(media_file, current_user):
        raise InsufficientPermissionsError("无权访问此文件")

    # 3. 获取缩略图路径
    try:
        thumbnail_path = path_utils.get_thumbnail_path(media_file.thumbnails, size)
    except ValueError as e:
        raise MediaFileNotFoundError(str(e))

    return thumbnail_path, media_file
