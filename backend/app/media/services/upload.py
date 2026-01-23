import logging
from pathlib import Path
from uuid import UUID

from app.core.config import settings
from app.media import cruds
from app.media.exceptions import (
    FileSizeExceededError,
    UnsupportedFileTypeError,
)
from app.media.model import FileUsage, MediaFile
from app.media.utils import (
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

    # 0. 计算哈希并检查重复
    import hashlib

    content_hash = hashlib.sha256(file_content).hexdigest()
    existing_media = await cruds.get_media_file_by_hash(session, content_hash)
    if existing_media:
        logger.info(f"文件已存在 (Hash 命中): {filename} -> {existing_media.file_path}")
        return existing_media

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
        content_hash=content_hash,
    )

    # 4. 生成缩略图（如果是图片）
    if should_generate_thumbnails(file_path, media_type):
        thumbnails = await generate_all_thumbnails_for_file(
            str(full_path), uploader_id, file_path
        )
        if thumbnails:
            media_file.thumbnails = thumbnails

    # 5. 保存到数据库
    media_file = await cruds.create_media_file(session, media_file)

    logger.info(f"成功创建媒体文件: {filename} -> {file_path}")
    return media_file
