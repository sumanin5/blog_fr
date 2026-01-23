"""
MIME类型检测函数
"""

import mimetypes

from .path import get_file_extension
from .validation import ALLOWED_EXTENSIONS


def get_mime_type(filename: str) -> str:
    """获取文件的MIME类型

    Args:
        filename: 文件名

    Returns:
        str: MIME类型
    """
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or "application/octet-stream"


def detect_media_type_from_filename(filename: str) -> str:
    """根据文件名检测媒体类型

    Args:
        filename: 文件名

    Returns:
        str: 检测到的媒体类型
    """
    ext = f".{get_file_extension(filename)}"

    # 根据扩展名判断
    for media_type, extensions in ALLOWED_EXTENSIONS.items():
        if ext in extensions:
            return media_type

    return "other"


def detect_media_type_from_mime(mime_type: str) -> str:
    """根据MIME类型检测媒体类型

    Args:
        mime_type: MIME类型

    Returns:
        str: 检测到的媒体类型
    """
    if mime_type.startswith("image/"):
        return "image"
    elif mime_type.startswith("video/"):
        return "video"
    elif mime_type in [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
        "text/x-markdown",  # MDX文件的MIME类型
    ]:
        return "document"
    else:
        return "other"
