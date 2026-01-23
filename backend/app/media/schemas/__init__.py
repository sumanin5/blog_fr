"""
媒体文件 Schema 模块

拆分为以下子模块：
- base: 基础 schema（MediaFileBase, MediaFileResponse）
- request: 请求 schema
- response: 响应 schema
"""

# 导出所有 schema（向后兼容）
from .base import MediaFileBase, MediaFileResponse
from .request import (
    BatchDeleteRequest,
    MediaFileFilters,
    MediaFileListParams,
    MediaFileQuery,
    MediaFileUpdate,
    MediaFileUpload,
    PublicMediaFilesParams,
    TogglePublicityRequest,
)
from .response import (
    BatchDeleteResponse,
    MediaFileListResponse,
    MediaFileUploadResponse,
    ThumbnailRegenerateResponse,
)

__all__ = [
    # base
    "MediaFileBase",
    "MediaFileResponse",
    # request
    "MediaFileUpload",
    "MediaFileUpdate",
    "MediaFileQuery",
    "MediaFileFilters",
    "MediaFileListParams",
    "PublicMediaFilesParams",
    "BatchDeleteRequest",
    "TogglePublicityRequest",
    # response
    "MediaFileListResponse",
    "MediaFileUploadResponse",
    "BatchDeleteResponse",
    "ThumbnailRegenerateResponse",
]
