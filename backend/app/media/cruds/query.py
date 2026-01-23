"""
查询操作

包含各种复杂查询操作
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from app.media.model import FileUsage, MediaFile, MediaType
from fastapi_pagination import Page, Params
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlmodel import and_, or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

# 注意: 本文件中存在许多 type: ignore 注释，这是因为 Pylance 无法正确识别
# SQLModel 的列（Column）对象的动态方法，如 .ilike(), .desc(), .is_() 等。


async def paginate_query(
    session: AsyncSession, query: select, params: Params = None
) -> Page:
    """通用分页查询"""
    return await paginate(session, query, params)


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
    stmt = select(MediaFile).where(MediaFile.is_public.is_(True))  # type: ignore

    if media_type:
        stmt = stmt.where(MediaFile.media_type == media_type)

    if usage:
        stmt = stmt.where(MediaFile.usage == usage)

    stmt = stmt.order_by(MediaFile.created_at.desc()).limit(limit).offset(offset)  # type: ignore

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
        and_(MediaFile.uploader_id == user_id, MediaFile.is_public.is_(True))  # type: ignore
    )

    if media_type:
        stmt = stmt.where(MediaFile.media_type == media_type)

    stmt = stmt.order_by(MediaFile.created_at.desc()).limit(limit).offset(offset)  # type: ignore

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_user_media_files(
    session: AsyncSession,
    user_id: UUID,
    q: Optional[str] = None,
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
        q: 搜索关键词
        media_type: 媒体类型过滤
        usage: 用途过滤
        is_public: 公开状态过滤
        limit: 限制数量
        offset: 偏移量

    Returns:
        MediaFile对象列表
    """
    stmt = select(MediaFile).where(MediaFile.uploader_id == user_id)

    if q:
        stmt = stmt.where(
            or_(
                MediaFile.original_filename.ilike(f"%{q}%"),  # type: ignore
                MediaFile.description.ilike(f"%{q}%"),  # type: ignore
            )
        )

    if media_type:
        stmt = stmt.where(MediaFile.media_type == media_type)

    if usage:
        stmt = stmt.where(MediaFile.usage == usage)

    if is_public is not None:
        stmt = stmt.where(MediaFile.is_public.is_(is_public))  # type: ignore

    stmt = stmt.order_by(MediaFile.created_at.desc()).limit(limit).offset(offset)  # type: ignore

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
        .order_by(MediaFile.created_at.desc())  # type: ignore
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
        stmt = stmt.where(MediaFile.tags.op("?")(tag))  # type: ignore

    if user_id:
        stmt = stmt.where(MediaFile.uploader_id == user_id)

    stmt = stmt.order_by(MediaFile.created_at.desc()).limit(limit).offset(offset)  # type: ignore

    result = await session.execute(stmt)
    return list(result.scalars().all())


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
        MediaFile.original_filename.ilike(f"%{query}%")  # type: ignore
        | MediaFile.description.ilike(f"%{query}%")  # type: ignore
        | MediaFile.alt_text.ilike(f"%{query}%")  # type: ignore
    )

    if user_id:
        stmt = stmt.where(MediaFile.uploader_id == user_id)

    if media_type:
        stmt = stmt.where(MediaFile.media_type == media_type)

    stmt = stmt.order_by(MediaFile.created_at.desc()).limit(limit).offset(offset)  # type: ignore

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_all_media_files(
    session: AsyncSession,
    q: Optional[str] = None,
    media_type: Optional[MediaType] = None,
    usage: Optional[FileUsage] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[MediaFile]:
    """获取所有媒体文件（管理员用）

    Args:
        session: 异步数据库会话
        q: 搜索关键词
        media_type: 媒体类型过滤
        usage: 用途过滤
        limit: 限制数量
        offset: 偏移量

    Returns:
        MediaFile对象列表
    """
    stmt = select(MediaFile)

    if q:
        stmt = stmt.where(
            or_(
                MediaFile.original_filename.ilike(f"%{q}%"),  # type: ignore
                MediaFile.description.ilike(f"%{q}%"),  # type: ignore
            )
        )

    if media_type:
        stmt = stmt.where(MediaFile.media_type == media_type)

    if usage:
        stmt = stmt.where(MediaFile.usage == usage)

    stmt = stmt.order_by(MediaFile.created_at.desc()).limit(limit).offset(offset)  # type: ignore

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
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    stmt = select(MediaFile).where(MediaFile.created_at >= cutoff_date)

    if user_id:
        stmt = stmt.where(MediaFile.uploader_id == user_id)

    stmt = stmt.order_by(MediaFile.created_at.desc()).limit(limit)  # type: ignore

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

    stmt = stmt.order_by(MediaFile.view_count.desc()).limit(limit)  # type: ignore

    result = await session.execute(stmt)
    return list(result.scalars().all())


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
    cutoff_date = datetime.utcnow() - timedelta(days=days_old)

    stmt = select(MediaFile).where(
        and_(MediaFile.is_processing, MediaFile.created_at < cutoff_date)
    )

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
        stmt = stmt.where(MediaFile.is_public.is_(is_public))  # type: ignore

    # 处理状态过滤
    if is_processing is not None:
        stmt = stmt.where(MediaFile.is_processing.is_(is_processing))  # type: ignore

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
            stmt = stmt.where(MediaFile.tags.op("?")(tag))  # type: ignore

    # 搜索关键词过滤
    if search_query:
        search_pattern = f"%{search_query}%"
        stmt = stmt.where(
            MediaFile.original_filename.ilike(search_pattern)  # type: ignore
            | MediaFile.description.ilike(search_pattern)  # type: ignore
            | MediaFile.alt_text.ilike(search_pattern)  # type: ignore
        )

    stmt = stmt.order_by(MediaFile.created_at.desc()).limit(limit).offset(offset)  # type: ignore

    result = await session.execute(stmt)
    return list(result.scalars().all())
