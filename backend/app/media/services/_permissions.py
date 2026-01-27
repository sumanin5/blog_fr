"""
权限检查工具（内部使用）

提取重复的权限检查逻辑，避免代码重复。
"""

from uuid import UUID

from app.core.exceptions import InsufficientPermissionsError
from app.media.exceptions import MediaFileNotFoundError
from app.media.model import MediaFile
from app.users.model import User


def check_file_ownership(
    media_file: MediaFile | None,
    current_user_id: UUID,
    is_superadmin: bool = False,
    operation: str = "操作",
) -> MediaFile:
    """检查文件所有权（通用权限检查）

    权限规则：
    - 超级管理员可以操作任何文件
    - 普通用户只能操作自己上传的文件

    Args:
        media_file: 媒体文件对象（可能为 None）
        current_user_id: 当前用户ID
        is_superadmin: 是否是超级管理员
        operation: 操作名称（用于错误提示）

    Returns:
        MediaFile: 验证通过的文件对象

    Raises:
        MediaFileNotFoundError: 文件不存在
        InsufficientPermissionsError: 权限不足
    """
    if not media_file:
        raise MediaFileNotFoundError("媒体文件不存在")

    # 超级管理员可以操作任何文件
    if is_superadmin:
        return media_file

    # 普通用户只能操作自己的文件
    if media_file.uploader_id != current_user_id:
        raise InsufficientPermissionsError(f"只能{operation}自己上传的文件")

    return media_file


def check_file_access(media_file: MediaFile, current_user: User) -> bool:
    """检查用户是否有权访问文件（查看/下载）

    权限规则：
    - 公开文件：任何人可访问
    - 私有文件：只有所有者和超级管理员可访问

    Args:
        media_file: 媒体文件对象
        current_user: 当前用户对象

    Returns:
        bool: 是否有权访问
    """

    return (
        media_file.is_public
        or (current_user is not None and media_file.uploader_id == current_user.id)
        or (current_user is not None and current_user.is_superadmin)
    )
