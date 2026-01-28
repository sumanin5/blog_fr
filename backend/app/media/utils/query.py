"""查询构建工具"""

from typing import Optional
from uuid import UUID

from app.media.model import FileUsage, MediaFile, MediaType
from sqlmodel import or_, select


def build_public_media_query(
    media_type: Optional[MediaType] = None,
    usage: Optional[FileUsage] = None,
) -> select:
    """构建公开媒体文件查询

    Args:
        media_type: 媒体类型过滤
        usage: 用途过滤

    Returns:
        SQLModel select 查询对象
    """
    stmt = select(MediaFile).where(MediaFile.is_public.is_(True))  # type: ignore

    if media_type:
        stmt = stmt.where(MediaFile.media_type == media_type)

    if usage:
        stmt = stmt.where(MediaFile.usage == usage)

    stmt = stmt.order_by(MediaFile.created_at.desc())  # type: ignore

    return stmt


def build_user_media_query(
    user_id: UUID,
    q: Optional[str] = None,
    media_type: Optional[MediaType] = None,
    usage: Optional[FileUsage] = None,
    mime_type: Optional[str] = None,
) -> select:
    """构建用户媒体文件查询

    Args:
        user_id: 用户ID
        q: 搜索关键词
        media_type: 媒体类型过滤
        usage: 用途过滤
        mime_type: MIME类型过滤 (支持模糊匹配)

    Returns:
        SQLModel select 查询对象
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

    if mime_type:
        stmt = stmt.where(MediaFile.mime_type.ilike(f"%{mime_type}%"))  # type: ignore

    stmt = stmt.order_by(MediaFile.created_at.desc())  # type: ignore

    return stmt


def build_search_media_query(
    query: str,
    user_id: Optional[UUID] = None,
    media_type: Optional[MediaType] = None,
) -> select:
    """构建搜索媒体文件查询

    Args:
        query: 搜索关键词
        user_id: 用户ID（可选）
        media_type: 媒体类型过滤

    Returns:
        SQLModel select 查询对象
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

    stmt = stmt.order_by(MediaFile.created_at.desc())  # type: ignore

    return stmt


def build_all_media_query(
    q: Optional[str] = None,
    media_type: Optional[MediaType] = None,
    usage: Optional[FileUsage] = None,
) -> select:
    """构建所有媒体文件查询（管理员用）

    Args:
        q: 搜索关键词
        media_type: 媒体类型过滤
        usage: 用途过滤

    Returns:
        SQLModel select 查询对象
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

    stmt = stmt.order_by(MediaFile.created_at.desc())  # type: ignore

    return stmt
