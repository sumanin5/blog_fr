"""
媒体文件业务逻辑服务

处理文件上传、删除等核心业务逻辑的纯函数
"""

import logging
from pathlib import Path
from typing import Optional
from uuid import UUID

from app.core.config import settings
from app.media import crud
from app.media.exceptions import (
    FileSizeExceededError,
    MediaFileNotFoundError,
    UnsupportedFileTypeError,
)
from app.media.model import FileUsage, MediaFile, MediaType
from app.media.schema import MediaFileUpdate
from app.media.utils import (
    cleanup_all_thumbnails,
    delete_file_from_disk,
    detect_media_type_from_mime,
    generate_all_thumbnails_for_file,
    generate_upload_path,
    get_mime_type,
    save_file_to_disk,
    should_generate_thumbnails,
    validate_file_extension,
    validate_file_size,
)
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


# ==========================================
# 文件创建相关函数
# ==========================================


async def create_media_file(
    file_content: bytes,
    filename: str,
    uploader_id: UUID,
    session: AsyncSession,
    usage: FileUsage = FileUsage.GENERAL,
    is_public: bool = False,
    description: str = "",
    alt_text: str = "",
) -> MediaFile:
    """创建媒体文件记录并保存文件

    Args:
        file_content: 文件内容
        filename: 原始文件名
        uploader_id: 上传者ID
        session: 数据库会话
        usage: 文件用途

    Returns:
        MediaFile: 创建的媒体文件实例

    Raises:
        UnsupportedFileTypeError: 不支持的文件类型
        FileSizeExceededError: 文件大小超出限制
    """
    if len(file_content) == 0:
        raise UnsupportedFileTypeError("不能上传空文件")
    # 1. 验证文件
    mime_type = get_mime_type(filename)
    media_type = detect_media_type_from_mime(mime_type)

    if not validate_file_extension(filename, media_type):
        raise UnsupportedFileTypeError(f"不支持的文件类型: {filename}")

    if not validate_file_size(len(file_content), media_type):
        raise FileSizeExceededError(f"文件大小超出限制: {len(file_content)} bytes")

    # 2. 生成存储路径并保存文件
    file_path = generate_upload_path(uploader_id, filename)
    full_path = Path(settings.MEDIA_ROOT) / file_path
    await save_file_to_disk(file_content, str(full_path))

    # 3. 创建数据库记录
    media_file = MediaFile(
        original_filename=filename,
        file_path=file_path,
        file_size=len(file_content),
        mime_type=mime_type,
        media_type=media_type,
        usage=usage,
        uploader_id=uploader_id,
        is_public=is_public,
        description=description,
        alt_text=alt_text,
    )

    # 4. 生成缩略图（如果是图片）
    if should_generate_thumbnails(file_path, media_type):
        thumbnails = await generate_all_thumbnails_for_file(
            str(full_path), uploader_id, file_path
        )
        if thumbnails:
            media_file.thumbnails = thumbnails

    # 5. 一次性提交所有更改
    session.add(media_file)
    await session.commit()
    await session.refresh(media_file)

    logger.info(f"成功创建媒体文件: {filename} -> {file_path}")
    return media_file


# ==========================================
# 文件删除相关函数
# ==========================================


async def update_media_file_info(
    session: AsyncSession,
    media_file: MediaFile,
    update_data: MediaFileUpdate,
) -> MediaFile:
    """更新媒体文件记录

    Args:
        session: 数据库会话
        media_file: 媒体文件实例
        update_data: 更新数据

    Returns:
        MediaFile: 更新后的媒体文件对象
    """
    updated_file = await crud.update_media_file(session, media_file, update_data)
    logger.info(f"成功更新媒体文件信息: {media_file.id}")
    return updated_file


async def delete_media_file(session: AsyncSession, media_file: MediaFile) -> None:
    """删除媒体文件及其缩略图

    Args:
        session: 数据库会话
        media_file: 要删除的媒体文件
    """
    # 1. 删除主文件
    main_file_path = Path(settings.MEDIA_ROOT) / media_file.file_path
    await delete_file_from_disk(str(main_file_path))

    # 2. 删除缩略图
    if media_file.thumbnails:
        await cleanup_all_thumbnails(media_file.thumbnails, settings.MEDIA_ROOT)

    # 3. 删除数据库记录
    await crud.delete_media_file(session, media_file)

    logger.info(f"成功删除媒体文件: {media_file.original_filename}")


async def delete_media_file_by_id(file_id: UUID, session: AsyncSession) -> None:
    """根据ID删除媒体文件

    Args:
        file_id: 文件ID
        session: 数据库会话

    Raises:
        MediaFileNotFoundError: 文件不存在
    """
    media_file = await get_media_file_by_id(file_id, session)
    if not media_file:
        raise MediaFileNotFoundError(f"媒体文件不存在: {file_id}")

    await delete_media_file(media_file, session)


# ==========================================
# 缩略图相关函数
# ==========================================


async def regenerate_thumbnails(
    media_file: MediaFile, session: AsyncSession
) -> dict[str, str]:
    """重新生成缩略图

    Args:
        media_file: 媒体文件实例
        session: 数据库会话

    Returns:
        dict: 新生成的缩略图路径字典
    """
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

    logger.info(f"重新生成缩略图完成: {media_file.original_filename}")
    return thumbnails


# ==========================================
# 查询相关函数
# ==========================================


async def get_media_file_by_id(
    file_id: UUID, session: AsyncSession
) -> MediaFile | None:
    """根据ID获取媒体文件

    Args:
        file_id: 文件ID
        session: 数据库会话

    Returns:
        MediaFile: 媒体文件实例或None
    """
    return await crud.get_media_file(session, file_id)


async def get_user_media_files(
    user_id: UUID,
    session: AsyncSession,
    media_type: Optional[MediaType] = None,
    usage: Optional[FileUsage] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[MediaFile]:
    """获取用户的媒体文件列表

    Args:
        user_id: 用户ID
        session: 数据库会话
        media_type: 媒体类型过滤
        usage: 用途过滤
        limit: 限制数量
        offset: 偏移量

    Returns:
        list: 媒体文件列表
    """
    return await crud.get_user_media_files(
        session=session,
        user_id=user_id,
        media_type=media_type,
        usage=usage,
        limit=limit,
        offset=offset,
    )


# ==========================================
# 响应转换函数
# ==========================================


def get_file_url(media_file: MediaFile) -> str:
    """获取文件访问URL（带权限检查）"""
    return f"{settings.BASE_URL}{settings.API_PREFIX}/media/{media_file.id}/view"


def format_thumbnail_info(media_file: MediaFile) -> Optional[dict]:
    """格式化缩略图信息"""
    if not media_file.thumbnails:
        return None

    base_url = settings.MEDIA_URL
    return {size: f"{base_url}{path}" for size, path in media_file.thumbnails.items()}


def format_media_response(media_file: MediaFile) -> dict:
    """将 MediaFile 转换为响应格式"""
    return {
        **media_file.model_dump(exclude={"thumbnails"}),
        "file_url": get_file_url(media_file),
        "thumbnails": format_thumbnail_info(media_file),
    }


def get_full_path(media_file: MediaFile) -> Path:
    """获取文件在磁盘上的完整路径"""
    return Path(settings.MEDIA_ROOT) / media_file.file_path


def get_thumbnail_path(media_file: MediaFile, size: str) -> Path:
    """获取缩略图在磁盘上的完整路径"""
    thumbnail_rel_path = media_file.thumbnails.get(size)
    if not thumbnail_rel_path:
        raise MediaFileNotFoundError(f"缩略图不存在: {size}")

    full_path = Path(settings.MEDIA_ROOT) / thumbnail_rel_path
    if not full_path.exists():
        raise MediaFileNotFoundError(f"缩略图文件不存在: {thumbnail_rel_path}")

    return full_path


# ==========================================
# 批量操作函数
# ==========================================


async def batch_delete_media_files(file_ids: list[UUID], session: AsyncSession) -> int:
    """批量删除媒体文件

    Args:
        file_ids: 文件ID列表
        session: 数据库会话

    Returns:
        int: 成功删除的文件数量
    """
    deleted_count = 0

    for file_id in file_ids:
        media_file = await get_media_file_by_id(file_id, session)
        if media_file:
            await delete_media_file(media_file, session)
            deleted_count += 1

    logger.info(f"批量删除完成，共删除 {deleted_count} 个文件")
    return deleted_count


async def get_media_files_by_usage(
    usage: FileUsage, session: AsyncSession, limit: int = 100
) -> list[MediaFile]:
    """根据用途获取媒体文件

    Args:
        usage: 文件用途
        session: 数据库会话
        limit: 限制数量

    Returns:
        list: 媒体文件列表
    """
    return await crud.get_media_files_by_usage(session, usage, limit)


async def search_media_files(
    session: AsyncSession,
    query: str,
    user_id: Optional[UUID] = None,
    media_type: Optional[MediaType] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[MediaFile]:
    """搜索媒体文件"""
    return await crud.search_media_files(
        session=session,
        query=query,
        user_id=user_id,
        media_type=media_type,
        limit=limit,
        offset=offset,
    )


async def get_all_media_files(
    session: AsyncSession,
    media_type: Optional[MediaType] = None,
    usage: Optional[FileUsage] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[MediaFile]:
    """获取所有媒体文件（管理员用）"""
    return await crud.get_all_media_files(
        session=session,
        media_type=media_type,
        usage=usage,
        limit=limit,
        offset=offset,
    )


async def increment_view_count(session: AsyncSession, media_file: MediaFile) -> None:
    """增加文件查看次数"""
    await crud.update_view_count(session, media_file)


async def increment_download_count(
    session: AsyncSession, media_file: MediaFile
) -> None:
    """增加文件下载次数"""
    await crud.update_download_count(session, media_file)


# ========================================
# 公开文件服务函数
# ========================================


async def get_public_media_files(
    session: AsyncSession,
    media_type: Optional[MediaType] = None,
    usage: Optional[FileUsage] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[MediaFile]:
    """获取公开的媒体文件列表

    Args:
        session: 数据库会话
        media_type: 媒体类型过滤
        usage: 用途过滤
        limit: 限制数量
        offset: 偏移量

    Returns:
        公开的MediaFile对象列表
    """
    return await crud.get_public_media_files(
        session=session,
        media_type=media_type,
        usage=usage,
        limit=limit,
        offset=offset,
    )


async def toggle_file_publicity(
    session: AsyncSession,
    file_id: UUID,
    user_id: UUID,
    is_public: bool,
) -> MediaFile:
    """切换文件的公开状态

    Args:
        session: 数据库会话
        file_id: 文件ID
        user_id: 当前用户ID
        is_public: 新的公开状态

    Returns:
        更新后的MediaFile对象

    Raises:
        MediaFileNotFoundError: 文件不存在
    """
    media_file = await crud.get_media_file(session, file_id)

    if not media_file:
        raise MediaFileNotFoundError(f"文件不存在: {file_id}")

    update_data = MediaFileUpdate(is_public=is_public)
    updated_file = await crud.update_media_file(session, media_file, update_data)

    logger.info(f"文件 {file_id} 公开状态已更新为: {is_public}")
    return updated_file


async def get_accessible_media_files(
    session: AsyncSession,
    current_user_id: Optional[UUID] = None,
    media_type: Optional[MediaType] = None,
    usage: Optional[FileUsage] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[MediaFile]:
    """获取用户可访问的媒体文件"""
    if current_user_id is None:
        return await get_public_media_files(
            session=session,
            media_type=media_type,
            usage=usage,
            limit=limit,
            offset=offset,
        )
    else:
        return await crud.get_media_files_by_criteria(
            session=session,
            user_id=current_user_id,
            media_type=media_type,
            usage=usage,
            limit=limit,
            offset=offset,
        )


async def get_user_media_stats(session: AsyncSession, user_id: UUID) -> dict:
    """获取用户的媒体文件统计信息"""
    return await crud.get_user_media_stats(session, user_id)
