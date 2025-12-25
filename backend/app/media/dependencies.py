"""
媒体文件依赖项

提供可复用的依赖项，如文件权限检查、文件获取等
"""

import logging
from typing import Annotated, Optional
from uuid import UUID

from app.core.db import get_async_session
from app.core.exceptions import InsufficientPermissionsError
from app.media import crud
from app.media.exceptions import MediaFileNotFoundError
from app.media.model import FileUsage, MediaFile, MediaType
from app.media.schema import MediaFileQuery
from app.users.dependencies import get_current_active_user
from app.users.model import User
from fastapi import Depends, File, Path, Query, UploadFile
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
    current_user: Annotated[User, Depends(get_current_active_user)],
    media_file: Annotated[MediaFile, Depends(get_media_file_by_id)],
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
    current_user: Annotated[User, Depends(get_current_active_user)],
    media_file: Annotated[MediaFile, Depends(get_media_file_by_id)],
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
    max_size: Optional[int] = None,
) -> callable:
    """创建文件上传验证依赖项（统一调用 utils 逻辑）

    该依赖项会在 Router 层面初步检查文件的扩展名。
    """
    from app.media import utils
    from app.media.exceptions import FileSizeExceededError, UnsupportedFileTypeError

    async def _validate(
        file: Annotated[UploadFile, File(..., description="要上传的文件")],
    ) -> UploadFile:
        # 1. 自动检测类型
        mime_type = file.content_type or utils.get_mime_type(file.filename)
        media_type = utils.detect_media_type_from_mime(mime_type)

        # 2. 验证扩展名（早于读取内容）
        if not utils.validate_file_extension(file.filename, media_type):
            raise UnsupportedFileTypeError(f"不支持的文件类型: {file.filename}")

        # 3. 验证大小（如果浏览器提供了 size 属性，进行初步拦截）
        if file.size:
            if max_size and file.size > max_size:
                raise FileSizeExceededError(f"文件超出自定义限制: {max_size}")
            if not utils.validate_file_size(file.size, media_type):
                raise FileSizeExceededError(f"文件超出 {media_type} 类型限制")

        return file

    return _validate


# ========================================
# 缓存相关依赖项
# ========================================


def get_cache_headers(
    media_file: MediaFile, max_age: int = 3600 * 24 * 7
) -> dict[str, str]:
    """获取缓存头（基于文件元数据生成动态 ETag）

    Args:
        media_file: 媒体文件对象
        max_age: 缓存时间（秒），默认 7 天

    Returns:
        缓存头字典
    """
    # 结合文件 ID 和最后修改时间生成 ETag
    # 这样如果文件由于某种原因更新了，ETag 也会变化
    mtime = int(media_file.updated_at.timestamp())
    etag = f'W/"{media_file.id}-{mtime}"'

    return {
        "Cache-Control": f"public, max-age={max_age}, must-revalidate",
        "ETag": etag,
    }
