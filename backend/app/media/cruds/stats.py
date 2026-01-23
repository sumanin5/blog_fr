"""
统计操作

包含各种统计查询操作
"""

from typing import Optional
from uuid import UUID

from app.media.model import MediaFile, MediaType
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession


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
    stmt = select(func.count(MediaFile.id)).where(MediaFile.uploader_id == user_id)  # type: ignore

    if media_type:
        stmt = stmt.where(MediaFile.media_type == media_type)

    result = await session.execute(stmt)
    count = result.scalar()
    return count if count is not None else 0


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
    total = result.scalar()
    return total if total is not None else 0


async def get_total_storage_size(session: AsyncSession) -> int:
    """获取系统总存储使用量

    Args:
        session: 异步数据库会话

    Returns:
        总存储使用量（字节）
    """
    stmt = select(func.sum(MediaFile.file_size))
    result = await session.execute(stmt)
    total = result.scalar()
    return total if total is not None else 0


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
        select(MediaFile.media_type, func.count(MediaFile.id))  # type: ignore
        .where(MediaFile.uploader_id == user_id)
        .group_by(MediaFile.media_type)
    )

    result = await session.execute(stmt)
    return {media_type: count for media_type, count in result.all()}


async def get_media_stats_by_usage(
    session: AsyncSession, user_id: UUID
) -> dict[str, int]:
    """获取用户各用途媒体文件统计

    Args:
        session: 异步数据库会话
        user_id: 用户ID

    Returns:
        各用途文件数量字典
    """
    stmt = (
        select(MediaFile.usage, func.count(MediaFile.id))  # type: ignore
        .where(MediaFile.uploader_id == user_id)
        .group_by(MediaFile.usage)
    )

    result = await session.execute(stmt)
    return {usage.value: count for usage, count in result.all()}


async def get_user_media_stats(session: AsyncSession, user_id: UUID) -> dict:
    """获取用户媒体文件统计信息 (综合)

    Args:
        session: 异步数据库会话
        user_id: 用户ID

    Returns:
        统计信息字典
    """
    total_count = await get_user_media_count(session, user_id)
    storage_usage = await get_user_storage_usage(session, user_id)
    stats_by_type = await get_media_stats_by_type(session, user_id)
    stats_by_usage = await get_media_stats_by_usage(session, user_id)

    # 统计公开/私有文件数量
    stmt_public = select(func.count(MediaFile.id)).where(
        MediaFile.uploader_id == user_id,
        MediaFile.is_public.is_(True),  # type: ignore
    )
    result_public = await session.execute(stmt_public)
    public_count = result_public.scalar() or 0

    return {
        "total_files": total_count,
        "total_size": storage_usage,
        "by_type": stats_by_type,
        "by_usage": stats_by_usage,
        "public_files": public_count,
        "private_files": total_count - public_count,
    }
