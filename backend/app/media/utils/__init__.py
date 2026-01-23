"""
媒体文件工具函数模块

拆分为以下子模块：
- path: 路径生成和获取函数
- file_ops: 文件操作函数
- thumbnail: 缩略图生成函数
- validation: 文件验证函数
- mime: MIME类型检测函数
- query: 查询构建函数
"""

from . import file_ops, mime, path, query, thumbnail, validation

# 重新导出常用函数（向后兼容）
from .file_ops import delete_file_from_disk, ensure_directory_exists, save_file_to_disk
from .mime import (
    detect_media_type_from_filename,
    detect_media_type_from_mime,
    get_mime_type,
)
from .path import (
    generate_thumbnail_path,
    generate_upload_path,
    get_file_extension,
    get_full_path,
    get_thumbnail_path,
)
from .query import (
    build_all_media_query,
    build_public_media_query,
    build_search_media_query,
    build_user_media_query,
)
from .thumbnail import (
    THUMBNAIL_SIZES,
    cleanup_all_thumbnails,
    create_thumbnail,
    generate_all_thumbnails_for_file,
    get_thumbnail_size,
    load_and_process_image,
    should_generate_thumbnails,
    smart_crop_and_resize,
)
from .validation import (
    ALLOWED_EXTENSIONS,
    FORBIDDEN_EXTENSIONS,
    MAX_FILE_SIZES,
    validate_file_extension,
    validate_file_size,
)

__all__ = [
    # 子模块
    "path",
    "file_ops",
    "thumbnail",
    "validation",
    "mime",
    "query",
    # 常用函数
    "generate_upload_path",
    "generate_thumbnail_path",
    "get_file_extension",
    "get_full_path",
    "get_thumbnail_path",
    "ensure_directory_exists",
    "save_file_to_disk",
    "delete_file_from_disk",
    "load_and_process_image",
    "smart_crop_and_resize",
    "create_thumbnail",
    "THUMBNAIL_SIZES",
    "get_thumbnail_size",
    "should_generate_thumbnails",
    "generate_all_thumbnails_for_file",
    "cleanup_all_thumbnails",
    "ALLOWED_EXTENSIONS",
    "MAX_FILE_SIZES",
    "FORBIDDEN_EXTENSIONS",
    "validate_file_extension",
    "validate_file_size",
    "get_mime_type",
    "detect_media_type_from_filename",
    "detect_media_type_from_mime",
    "build_public_media_query",
    "build_user_media_query",
    "build_search_media_query",
    "build_all_media_query",
]
