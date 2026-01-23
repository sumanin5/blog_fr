"""
路径生成和获取函数
"""

import logging
from pathlib import Path
from typing import Optional
from uuid import UUID, uuid4

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_file_extension(filename: str) -> str:
    """提取文件扩展名

    Args:
        filename: 文件名

    Returns:
        str: 文件扩展名（小写，不包含点）
    """
    if "." not in filename:
        return "bin"

    ext = filename.split(".")[-1].lower()
    return ext if ext else "bin"


def generate_upload_path(
    user_id: UUID, filename: str, base_dir: Optional[str] = None
) -> str:
    """生成媒体文件存储路径（按时间组织）

    Args:
        user_id: 用户UUID
        filename: 原始文件名
        base_dir: 基础目录，如果为None则使用默认的"uploads"

    Returns:
        str: 生成的相对文件路径，格式: "uploads/2025/01/15_143022_123e4567e89b12d.jpg"
    """
    from datetime import datetime

    # 使用默认的相对路径
    if base_dir is None:
        base_dir = "uploads"

    # 获取当前时间
    now = datetime.now()

    # 提取文件扩展名
    ext = get_file_extension(filename)

    # 生成UUID并取前15位（去掉连字符）
    file_uuid = str(uuid4()).replace("-", "")[:15]

    # 构建文件名：日期_时分秒_UUID前15位.扩展名
    # 格式：15_143022_123e4567e89b12d.jpg
    new_filename = f"{now.day:02d}_{now.strftime('%H%M%S')}_{file_uuid}.{ext}"

    # 构建相对路径：uploads/年份/月份/文件名
    path = f"{base_dir}/{now.year}/{now.month:02d}/{new_filename}"

    logger.debug(f"生成上传路径: {path}")
    return path


def generate_thumbnail_path(
    user_id: UUID, size: str, original_path: str, base_dir: Optional[str] = None
) -> str:
    """生成缩略图存储路径（按时间组织）

    Args:
        user_id: 用户UUID
        size: 缩略图尺寸标识 (如 "small", "medium", "large")
        original_path: 原始文件路径
        base_dir: 基础目录，如果为None则使用默认的"thumbnails"

    Returns:
        str: 生成的缩略图相对路径
    """
    from datetime import datetime

    # 使用默认的相对路径
    if base_dir is None:
        base_dir = "thumbnails"

    # 从原始路径提取时间信息和文件名
    # 原始路径格式: uploads/2025/01/15_143022_123e4567e89b12d.jpg
    path_parts = Path(original_path).parts

    if len(path_parts) >= 3:  # uploads/年份/月份/文件名
        year = path_parts[-3]  # 倒数第三个是年份
        month = path_parts[-2]  # 倒数第二个是月份
        original_filename = Path(original_path).stem  # 不含扩展名
    else:
        # 如果路径格式不符合预期，使用当前时间
        now = datetime.now()
        year = str(now.year)
        month = f"{now.month:02d}"
        original_filename = Path(original_path).stem

    # 生成缩略图文件名：尺寸_原始文件名.webp
    thumbnail_filename = f"{size}_{original_filename}.webp"

    # 构建相对路径：thumbnails/年份/月份/缩略图文件名
    path = f"{base_dir}/{year}/{month}/{thumbnail_filename}"

    logger.debug(f"生成缩略图路径: {path}")
    return path


def get_full_path(file_path: str) -> Path:
    """获取文件在磁盘上的完整路径

    Args:
        file_path: 文件的相对路径（如 uploads/2025/01/file.jpg）

    Returns:
        Path: 文件的完整路径
    """
    return Path(settings.MEDIA_ROOT) / file_path


def get_thumbnail_path(thumbnails: dict[str, str], size: str) -> Path:
    """获取缩略图在磁盘上的完整路径

    Args:
        thumbnails: 缩略图路径字典
        size: 缩略图尺寸标识

    Returns:
        Path: 缩略图的完整路径

    Raises:
        ValueError: 缩略图不存在或文件不存在
    """
    thumbnail_rel_path = thumbnails.get(size)
    if not thumbnail_rel_path:
        raise ValueError(f"缩略图不存在: {size}")

    full_path = Path(settings.MEDIA_ROOT) / thumbnail_rel_path
    if not full_path.exists():
        raise ValueError(f"缩略图文件不存在: {thumbnail_rel_path}")

    return full_path
