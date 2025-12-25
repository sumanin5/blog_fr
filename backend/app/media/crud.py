"""
媒体文件数据库操作（CRUD）- SQLModel 版本

使用 SQLModel 的简化语法进行数据库操作
"""

import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from app.media.model import FileUsage, MediaFile, MediaType
from app.media.schema import MediaFileUpdate
from sqlmodel import and_, func, select
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


# ========================================
# 基础 CRUD 操作
# ========================================


async def get_media_file(session: AsyncSession, file_id: UUID) -> Optional[MediaFile]:
    """根据ID获取媒体文件

    Args:
        session: 异步数据库会话
        file_id: 文件ID

    Returns:
        MediaFile对象或None
    """
    return await session.get(MediaFile, file_id)


async def get_media_file_by_path(
    session: AsyncSession, file_path: str
) -> Optional[MediaFile]:
    """根据文件路径获取媒体文件

    Args:
        session: 异步数据库会话
        file_path: 文件路径

    Returns:
        MediaFile对象或None
    """
    stmt = select(MediaFile).where(MediaFile.file_path == file_path)
    result = await session.execute(stmt)
    return result.first()


async def update_media_file(
    session: AsyncSession, media_file: MediaFile, update_data: MediaFileUpdate
) -> MediaFile:
    """更新媒体文件信息

    Args:
        session: 异步数据库会话
        media_file: 要更新的媒体文件对象
        update_data: 更新数据

    Returns:
        更新后的MediaFile对象
    """
    update_dict = update_data.model_dump(exclude_unset=True)

    for field, value in update_dict.items():
        setattr(media_file, field, value)

    session.add(media_file)
    await session.commit()
    await session.refresh(media_file)

    logger.info(f"更新媒体文件: {media_file.id}")
    return media_file


async def delete_media_file(session: AsyncSession, media_file: MediaFile) -> None:
    """删除媒体文件记录

    Args:
        session: 异步数据库会话
        media_file: 要删除的媒体文件对象
    """
    await session.delete(media_file)
    await session.commit()
    logger.info(f"删除媒体文件记录: {media_file.id}")


# ========================================
# 公开文件查询操作
# ========================================


async def get_public_media_files(
    session: AsyncSession,
    media_type: Optional[MediaType] = None,
    usage: Optional[FileUsage] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[MediaFile]:
    """获取公开的媒体文件列表（无需认证）

    Args:
        session: 异步数据库会话
        media_type: 媒体类型过滤
        usage: 用途过滤
        limit: 限制数量
        offset: 偏移量

    Returns:
        公开的MediaFile对象列表
    """
    stmt = select(MediaFile).where(MediaFile.is_public.is_(True))

    if media_type:
        stmt = stmt.where(MediaFile.media_type == media_type)

    if usage:
        stmt = stmt.where(MediaFile.usage == usage)

    stmt = stmt.order_by(MediaFile.created_at.desc()).limit(limit).offset(offset)

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_user_public_files(
    session: AsyncSession,
    user_id: UUID,
    media_type: Optional[MediaType] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[MediaFile]:
    """获取用户的公开文件

    Args:
        session: 异步数据库会话
        user_id: 用户ID
        media_type: 媒体类型过滤
        limit: 限制数量
        offset: 偏移量

    Returns:
        用户公开的MediaFile对象列表
    """
    stmt = select(MediaFile).where(
        and_(MediaFile.uploader_id == user_id, MediaFile.is_public.is_(True))
    )

    if media_type:
        stmt = stmt.where(MediaFile.media_type == media_type)

    stmt = stmt.order_by(MediaFile.created_at.desc()).limit(limit).offset(offset)

    result = await session.execute(stmt)
    return list(result.scalars().all())


# ========================================
# 查询操作
# ========================================


async def get_user_media_files(
    session: AsyncSession,
    user_id: UUID,
    media_type: Optional[MediaType] = None,
    usage: Optional[FileUsage] = None,
    is_public: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[MediaFile]:
    """获取用户的媒体文件列表

    Args:
        session: 异步数据库会话
        user_id: 用户ID
        media_type: 媒体类型过滤
        usage: 用途过滤
        is_public: 公开状态过滤
        limit: 限制数量
        offset: 偏移量

    Returns:
        MediaFile对象列表
    """
    stmt = select(MediaFile).where(MediaFile.uploader_id == user_id)

    if media_type:
        stmt = stmt.where(MediaFile.media_type == media_type)

    if usage:
        stmt = stmt.where(MediaFile.usage == usage)

    if is_public is not None:
        stmt = stmt.where(MediaFile.is_public.is_(is_public))

    stmt = stmt.order_by(MediaFile.created_at.desc()).limit(limit).offset(offset)

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_media_files_by_usage(
    session: AsyncSession, usage: FileUsage, limit: int = 100
) -> list[MediaFile]:
    """根据用途获取媒体文件

    Args:
        session: 异步数据库会话
        usage: 文件用途
        limit: 限制数量

    Returns:
        MediaFile对象列表
    """
    stmt = (
        select(MediaFile)
        .where(MediaFile.usage == usage)
        .order_by(MediaFile.created_at.desc())
        .limit(limit)
    )

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_media_files_by_tags(
    session: AsyncSession,
    tags: list[str],
    user_id: Optional[UUID] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[MediaFile]:
    """根据标签获取媒体文件

    Args:
        session: 异步数据库会话
        tags: 标签列表
        user_id: 用户ID（可选）
        limit: 限制数量
        offset: 偏移量

    Returns:
        MediaFile对象列表
    """
    stmt = select(MediaFile)

    # 使用 JSON 操作符查询包含指定标签的文件
    for tag in tags:
        stmt = stmt.where(MediaFile.tags.op("?")(tag))

    if user_id:
        stmt = stmt.where(MediaFile.uploader_id == user_id)

    stmt = stmt.order_by(MediaFile.created_at.desc()).limit(limit).offset(offset)

    result = await session.execute(stmt)
    return list(result.scalars().all())


# ========================================
# 统计操作
# ========================================


async def get_user_media_count(
    session: AsyncSession, user_id: UUID, media_type: Optional[MediaType] = None
) -> int:
    """获取用户媒体文件数量

    Args:
        session: 异步数据库会话
        user_id: 用户ID
        media_type: 媒体类型过滤

    Returns:
        文件数量
    """
    stmt = select(func.count(MediaFile.id)).where(MediaFile.uploader_id == user_id)

    if media_type:
        stmt = stmt.where(MediaFile.media_type == media_type)

    result = await session.execute(stmt)
    return result.one() or 0


async def get_user_storage_usage(session: AsyncSession, user_id: UUID) -> int:
    """获取用户存储使用量

    Args:
        session: 异步数据库会话
        user_id: 用户ID

    Returns:
        存储使用量（字节）
    """
    stmt = select(func.sum(MediaFile.file_size)).where(MediaFile.uploader_id == user_id)
    result = await session.execute(stmt)
    return result.one() or 0


async def get_media_stats_by_type(
    session: AsyncSession, user_id: UUID
) -> dict[str, int]:
    """获取用户各类型媒体文件统计

    Args:
        session: 异步数据库会话
        user_id: 用户ID

    Returns:
        各类型文件数量字典
    """
    stmt = (
        select(MediaFile.media_type, func.count(MediaFile.id))
        .where(MediaFile.uploader_id == user_id)
        .group_by(MediaFile.media_type)
    )

    result = await session.execute(stmt)
    return {media_type: count for media_type, count in result.all()}


async def get_user_media_stats(session: AsyncSession, user_id: UUID) -> dict:
    """获取用户媒体文件统计信息 (综合)"""
    total_count = await get_user_media_count(session, user_id)
    storage_usage = await get_user_storage_usage(session, user_id)
    stats_by_type = await get_media_stats_by_type(session, user_id)

    return {
        "total_files": total_count,
        "storage_usage": storage_usage,
        "files_by_type": stats_by_type,
    }


# ========================================
# 批量操作
# ========================================


async def get_media_files_by_ids(
    session: AsyncSession, file_ids: list[UUID]
) -> list[MediaFile]:
    """根据ID列表获取媒体文件

    Args:
        session: 异步数据库会话
        file_ids: 文件ID列表

    Returns:
        MediaFile对象列表
    """
    stmt = select(MediaFile).where(MediaFile.id.in_(file_ids))
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def update_view_count(session: AsyncSession, media_file: MediaFile) -> None:
    """增加文件查看次数

    Args:
        session: 异步数据库会话
        media_file: 媒体文件对象
    """
    media_file.view_count += 1
    session.add(media_file)
    await session.commit()


async def update_download_count(session: AsyncSession, media_file: MediaFile) -> None:
    """增加文件下载次数

    Args:
        session: 异步数据库会话
        media_file: 媒体文件对象
    """
    media_file.download_count += 1
    session.add(media_file)
    await session.commit()


# ========================================
# 搜索操作
# ========================================


async def search_media_files(
    session: AsyncSession,
    query: str,
    user_id: Optional[UUID] = None,
    media_type: Optional[MediaType] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[MediaFile]:
    """搜索媒体文件

    Args:
        session: 异步数据库会话
        query: 搜索关键词
        user_id: 用户ID（可选）
        media_type: 媒体类型过滤
        limit: 限制数量
        offset: 偏移量

    Returns:
        MediaFile对象列表
    """
    stmt = select(MediaFile).where(
        MediaFile.original_filename.ilike(f"%{query}%")
        | MediaFile.description.ilike(f"%{query}%")
        | MediaFile.alt_text.ilike(f"%{query}%")
    )

    if user_id:
        stmt = stmt.where(MediaFile.uploader_id == user_id)

    if media_type:
        stmt = stmt.where(MediaFile.media_type == media_type)

    stmt = stmt.order_by(MediaFile.created_at.desc()).limit(limit).offset(offset)

    result = await session.execute(stmt)
    return list(result.scalars().all())


# ========================================
# 清理操作
# ========================================


async def get_orphaned_files(
    session: AsyncSession, days_old: int = 7
) -> list[MediaFile]:
    """获取孤立文件（处理失败或长时间处理中的文件）

    Args:
        session: 异步数据库会话
        days_old: 天数阈值

    Returns:
        孤立的MediaFile对象列表
    """
    from datetime import datetime, timedelta

    cutoff_date = datetime.utcnow() - timedelta(days=days_old)

    stmt = select(MediaFile).where(
        and_(MediaFile.is_processing, MediaFile.created_at < cutoff_date)
    )

    result = await session.execute(stmt)
    return list(result.scalars().all())


# ========================================
# 高级查询操作
# ========================================


async def get_all_media_files(
    session: AsyncSession,
    media_type: Optional[MediaType] = None,
    usage: Optional[FileUsage] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[MediaFile]:
    """获取所有媒体文件（管理员用）

    Args:
        session: 异步数据库会话
        media_type: 媒体类型过滤
        usage: 用途过滤
        limit: 限制数量
        offset: 偏移量

    Returns:
        MediaFile对象列表
    """
    stmt = select(MediaFile)

    if media_type:
        stmt = stmt.where(MediaFile.media_type == media_type)

    if usage:
        stmt = stmt.where(MediaFile.usage == usage)

    stmt = stmt.order_by(MediaFile.created_at.desc()).limit(limit).offset(offset)

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_recent_files(
    session: AsyncSession,
    user_id: Optional[UUID] = None,
    days: int = 7,
    limit: int = 20,
) -> list[MediaFile]:
    """获取最近上传的文件

    Args:
        session: 异步数据库会话
        user_id: 用户ID（可选，不提供则获取所有用户的）
        days: 最近天数
        limit: 限制数量

    Returns:
        MediaFile对象列表
    """
    from datetime import datetime, timedelta

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    stmt = select(MediaFile).where(MediaFile.created_at >= cutoff_date)

    if user_id:
        stmt = stmt.where(MediaFile.uploader_id == user_id)

    stmt = stmt.order_by(MediaFile.created_at.desc()).limit(limit)

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_popular_files(
    session: AsyncSession, user_id: Optional[UUID] = None, limit: int = 20
) -> list[MediaFile]:
    """获取热门文件（按查看次数排序）

    Args:
        session: 异步数据库会话
        user_id: 用户ID（可选）
        limit: 限制数量

    Returns:
        MediaFile对象列表
    """
    stmt = select(MediaFile).where(MediaFile.view_count > 0)

    if user_id:
        stmt = stmt.where(MediaFile.uploader_id == user_id)

    stmt = stmt.order_by(MediaFile.view_count.desc()).limit(limit)

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_media_files_by_criteria(
    session: AsyncSession,
    user_id: Optional[UUID] = None,
    media_type: Optional[MediaType] = None,
    usage: Optional[FileUsage] = None,
    is_public: Optional[bool] = None,
    is_processing: Optional[bool] = None,
    file_size_min: Optional[int] = None,
    file_size_max: Optional[int] = None,
    created_after: Optional[datetime] = None,
    created_before: Optional[datetime] = None,
    tags: Optional[list[str]] = None,
    search_query: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[MediaFile]:
    """根据多种条件查询媒体文件

    Args:
        session: 异步数据库会话
        user_id: 用户ID（可选）
        media_type: 媒体类型过滤
        usage: 用途过滤
        is_public: 是否公开
        is_processing: 是否处理中
        file_size_min: 最小文件大小
        file_size_max: 最大文件大小
        created_after: 创建时间起始
        created_before: 创建时间结束
        tags: 标签列表
        search_query: 搜索关键词
        limit: 限制数量
        offset: 偏移量

    Returns:
        MediaFile对象列表
    """
    stmt = select(MediaFile)

    # 用户过滤
    if user_id:
        stmt = stmt.where(MediaFile.uploader_id == user_id)

    # 媒体类型过滤
    if media_type:
        stmt = stmt.where(MediaFile.media_type == media_type)

    # 用途过滤
    if usage:
        stmt = stmt.where(MediaFile.usage == usage)

    # 公开状态过滤
    if is_public is not None:
        stmt = stmt.where(MediaFile.is_public.is_(is_public))

    # 处理状态过滤
    if is_processing is not None:
        stmt = stmt.where(MediaFile.is_processing.is_(is_processing))

    # 文件大小过滤
    if file_size_min is not None:
        stmt = stmt.where(MediaFile.file_size >= file_size_min)

    if file_size_max is not None:
        stmt = stmt.where(MediaFile.file_size <= file_size_max)

    # 时间范围过滤
    if created_after:
        stmt = stmt.where(MediaFile.created_at >= created_after)

    if created_before:
        stmt = stmt.where(MediaFile.created_at <= created_before)

    # 标签过滤
    if tags:
        for tag in tags:
            stmt = stmt.where(MediaFile.tags.op("?")(tag))

    # 搜索关键词过滤
    if search_query:
        search_pattern = f"%{search_query}%"
        stmt = stmt.where(
            MediaFile.original_filename.ilike(search_pattern)
            | MediaFile.description.ilike(search_pattern)
            | MediaFile.alt_text.ilike(search_pattern)
        )

    stmt = stmt.order_by(MediaFile.created_at.desc()).limit(limit).offset(offset)

    result = await session.execute(stmt)
    return list(result.scalars().all())
