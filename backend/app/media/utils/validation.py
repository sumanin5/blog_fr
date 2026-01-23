"""
文件验证函数
"""

from .path import get_file_extension

# 允许的文件扩展名
ALLOWED_EXTENSIONS = {
    "image": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"},
    "video": {".mp4", ".webm", ".avi", ".mov", ".wmv"},
    "document": {".pdf", ".doc", ".docx", ".txt", ".rtf", ".md", ".mdx"},
}

# 文件大小限制 (字节)
# 注意：这些限制在业务逻辑层面生效，全局上传限制为 150MB（在 middleware 中定义）
MAX_FILE_SIZES = {
    "image": 10 * 1024 * 1024,  # 10MB - 普通图片（封面、截图等）
    "video": 100 * 1024 * 1024,  # 100MB - 短视频、Demo视频
    "document": 20 * 1024 * 1024,  # 20MB - PDF、Word文档等
    "other": 5 * 1024 * 1024,  # 5MB - 其他文件
}

# 黑名单扩展名
FORBIDDEN_EXTENSIONS = {".exe", ".bat", ".cmd", ".scr", ".com", ".pif"}


def validate_file_extension(filename: str, media_type: str) -> bool:
    """验证文件扩展名

    Args:
        filename: 文件名
        media_type: 媒体类型

    Returns:
        bool: 是否允许该扩展名
    """
    ext = f".{get_file_extension(filename)}"

    # 检查黑名单
    if ext.lower() in FORBIDDEN_EXTENSIONS:
        return False

    allowed_exts = ALLOWED_EXTENSIONS.get(media_type, set())
    if not allowed_exts:  # 'other' 类型允许所有扩展名（除了黑名单）
        return True
    return ext in allowed_exts


def validate_file_size(file_size: int, media_type: str) -> bool:
    """验证文件大小

    Args:
        file_size: 文件大小（字节）
        media_type: 媒体类型

    Returns:
        bool: 是否在允许的大小范围内
    """
    max_size = MAX_FILE_SIZES.get(media_type, MAX_FILE_SIZES["other"])
    return file_size <= max_size
