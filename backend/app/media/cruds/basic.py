"""
基础 CRUD 操作

包含基本的增删改查操作
"""

import logging
from typing import Optional
from uuid import UUID

from app.media.model import MediaFile
from app.media.schemas import MediaFileUpdate
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


async def create_media_file(session: AsyncSession, media_file: MediaFile) -> MediaFile:
    """创建媒体文件记录

    Args:
        session: 异步数据库会话
        media_file: 媒体文件对象

    Returns:
        创建的MediaFile对象
    """
    session.add(media_file)
    await session.commit()
    await session.refresh(media_file)
    logger.info(f"创建媒体文件记录: {media_file.id}")
    return media_file


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
    media_file = result.scalars().first()
    return media_file


async def get_media_file_by_hash(
    session: AsyncSession, content_hash: str
) -> Optional[MediaFile]:
    """根据内容哈希获取媒体文件 (用于去重)"""
    stmt = select(MediaFile).where(MediaFile.content_hash == content_hash)
    result = await session.execute(stmt)
    return result.scalars().first()


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
    stmt = select(MediaFile).where(MediaFile.id.in_(file_ids))  # type: ignore
    result = await session.execute(stmt)
    return list(result.scalars().all())


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
