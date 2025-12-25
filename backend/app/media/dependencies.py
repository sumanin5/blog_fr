"""
媒体文件依赖项

提供可复用的依赖项，如文件权限检查、文件获取等
"""

import logging
from typing import Annotated
from uuid import UUID

from app.core.db import get_async_session
from app.core.exceptions import InsufficientPermissionsError
from app.media import crud
from app.media.exceptions import MediaFileNotFoundError
from app.media.model import FileUsage, MediaFile, MediaType
from app.media.schema import MediaFileQuery
from app.users.dependencies import get_current_active_user
from app.users.model import User
from fastapi import Depends, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# ========================================
# 路径参数依赖项
# ========================================


async def get_media_file_by_id(
    file_id: Annotated[UUID, Path(..., description="媒体文件ID")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> MediaFile:
    """根据ID获取媒体文件

    Args:
        file_id: 文件ID
        session: 数据库会话

    Returns:
        MediaFile对象

    Raises:
        MediaFileNotFoundError: 文件不存在
    """
    media_file = await crud.get_media_file(session, file_id)
    if not media_file:
        raise MediaFileNotFoundError(f"媒体文件不存在: {file_id}")

    return media_file


# ========================================
# 权限检查依赖项
# ========================================


async def check_file_owner_or_admin(
    media_file: Annotated[MediaFile, Depends(get_media_file_by_id)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> MediaFile:
    """检查用户是否为文件所有者或管理员

    Args:
        media_file: 媒体文件对象
        current_user: 当前用户

    Returns:
        MediaFile对象

    Raises:
        InsufficientPermissionsError: 权限不足
    """
    if media_file.uploader_id != current_user.id and not current_user.is_admin:
        logger.warning(
            f"用户 {current_user.username} 尝试访问不属于自己的文件: {media_file.id}"
        )
        raise InsufficientPermissionsError("只能访问自己上传的文件")

    return media_file


async def check_file_owner(
    media_file: Annotated[MediaFile, Depends(get_media_file_by_id)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> MediaFile:
    """检查用户是否为文件所有者

    Args:
        media_file: 媒体文件对象
        current_user: 当前用户

    Returns:
        MediaFile对象

    Raises:
        InsufficientPermissionsError: 权限不足
    """
    if media_file.uploader_id != current_user.id:
        logger.warning(
            f"用户 {current_user.username} 尝试修改不属于自己的文件: {media_file.id}"
        )
        raise InsufficientPermissionsError("只能修改自己上传的文件")

    return media_file


# ========================================
# 查询参数依赖项
# ========================================


def get_media_query_params(
    media_type: Annotated[MediaType | None, Query(description="媒体类型过滤")] = None,
    usage: Annotated[FileUsage | None, Query(description="用途过滤")] = None,
    limit: Annotated[int, Query(ge=1, le=100, description="限制数量")] = 50,
    offset: Annotated[int, Query(ge=0, description="偏移量")] = 0,
) -> MediaFileQuery:
    """获取媒体文件查询参数

    Args:
        media_type: 媒体类型过滤
        usage: 用途过滤
        limit: 限制数量
        offset: 偏移量

    Returns:
        MediaFileQuery对象
    """
    return MediaFileQuery(
        media_type=media_type, usage=usage, limit=limit, offset=offset
    )


def get_search_params(
    q: Annotated[
        str | None, Query(min_length=1, max_length=100, description="搜索关键词")
    ] = None,
    media_type: Annotated[MediaType | None, Query(description="媒体类型过滤")] = None,
    limit: Annotated[int, Query(ge=1, le=100, description="限制数量")] = 50,
    offset: Annotated[int, Query(ge=0, description="偏移量")] = 0,
) -> dict:
    """获取搜索参数

    Args:
        q: 搜索关键词
        media_type: 媒体类型过滤
        limit: 限制数量
        offset: 偏移量

    Returns:
        搜索参数字典
    """
    return {"query": q, "media_type": media_type, "limit": limit, "offset": offset}


# ========================================
# 文件上传相关依赖项
# ========================================


def validate_file_upload(
    max_size: int = 10 * 1024 * 1024,  # 10MB
    allowed_types: list[str] | None = None,
) -> callable:
    """创建文件上传验证依赖项

    Args:
        max_size: 最大文件大小（字节）
        allowed_types: 允许的MIME类型列表

    Returns:
        验证函数
    """
    if allowed_types is None:
        allowed_types = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "video/mp4",
            "video/webm",
            "application/pdf",
            "text/plain",
        ]

    def _validate(file_size: int, mime_type: str) -> bool:
        """验证文件

        Args:
            file_size: 文件大小
            mime_type: MIME类型

        Returns:
            是否通过验证
        """
        if file_size > max_size:
            return False

        if mime_type not in allowed_types:
            return False

        return True

    return _validate


# ========================================
# 统计相关依赖项
# ========================================


async def get_user_media_stats(
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> dict:
    """获取用户媒体文件统计信息

    Args:
        current_user: 当前用户
        session: 数据库会话

    Returns:
        统计信息字典
    """
    total_count = await crud.get_user_media_count(session, current_user.id)
    storage_usage = await crud.get_user_storage_usage(session, current_user.id)
    stats_by_type = await crud.get_media_stats_by_type(session, current_user.id)

    return {
        "total_files": total_count,
        "storage_usage": storage_usage,
        "files_by_type": stats_by_type,
    }


# ========================================
# 缓存相关依赖项
# ========================================


def get_cache_headers(max_age: int = 3600) -> dict[str, str]:
    """获取缓存头

    Args:
        max_age: 缓存时间（秒）

    Returns:
        缓存头字典
    """
    return {
        "Cache-Control": f"public, max-age={max_age}",
        "ETag": "media-file-etag",  # 实际应用中应该基于文件内容生成
    }
