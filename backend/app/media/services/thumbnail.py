"""
媒体文件业务逻辑服务

处理文件上传、删除等核心业务逻辑的纯函数
"""

import logging
from pathlib import Path
from uuid import UUID

from app.core.config import settings
from app.media import cruds
from app.media.utils import (
    cleanup_all_thumbnails,
    generate_all_thumbnails_for_file,
)
from sqlmodel.ext.asyncio.session import AsyncSession

from ._permissions import check_file_ownership

logger = logging.getLogger(__name__)


async def regenerate_thumbnails(
    file_id: UUID,
    session: AsyncSession,
    current_user_id: UUID,
    is_superadmin: bool = False,
) -> dict[str, str]:
    """重新生成缩略图（带细粒度权限检查）

    Args:
        file_id: 文件ID
        session: 数据库会话
        current_user_id: 当前用户ID
        is_superadmin: 是否是超级管理员

    Returns:
        dict: 新生成的缩略图路径字典

    Raises:
        MediaFileNotFoundError: 文件不存在
        InsufficientPermissionsError: 权限不足（非所有者且非超级管理员）
    """

    media_file = await cruds.get_media_file(session, file_id)
    check_file_ownership(
        media_file, current_user_id, is_superadmin, "regenerate thumbnails"
    )

    # 1. 清理旧缩略图
    if media_file.thumbnails:
        await cleanup_all_thumbnails(media_file.thumbnails, settings.MEDIA_ROOT)

    # 2. 重新生成
    source_path = Path(settings.MEDIA_ROOT) / media_file.file_path
    thumbnails = await generate_all_thumbnails_for_file(
        str(source_path), media_file.uploader_id, media_file.file_path
    )

    # 3. 更新数据库
    media_file.thumbnails = thumbnails
    await session.commit()

    logger.info(
        f"重新生成缩略图完成: {media_file.original_filename} by user {current_user_id}"
    )
    return thumbnails
