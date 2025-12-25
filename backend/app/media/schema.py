"""
媒体文件请求/响应模型（Pydantic Schemas）

用于 API 的请求验证和响应序列化
"""

import uuid
from datetime import datetime
from typing import Optional

from app.media.model import FileUsage, MediaType
from pydantic import BaseModel, Field, HttpUrl

# ========================================
# 基础模型（共享字段）
# ========================================


class MediaFileBase(BaseModel):
    """媒体文件基础模型（共享字段）"""

    original_filename: str = Field(..., max_length=255, description="原始文件名")
    usage: FileUsage = Field(FileUsage.GENERAL, description="文件用途")
    description: str = Field("", max_length=500, description="文件描述")
    alt_text: str = Field("", max_length=255, description="替代文本（图片用）")
    tags: list[str] = Field(default_factory=list, description="标签列表")


# ========================================
# 请求模型（用于接收客户端数据）
# ========================================


class MediaFileUpload(BaseModel):
    """文件上传请求模型"""

    usage: FileUsage = Field(FileUsage.GENERAL, description="文件用途")
    description: str = Field("", max_length=500, description="文件描述")
    alt_text: str = Field("", max_length=255, description="替代文本（图片用）")
    tags: list[str] = Field(default_factory=list, description="标签列表")
    is_public: bool = Field(False, description="是否公开")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "usage": "avatar",
                    "description": "用户头像",
                    "alt_text": "用户头像图片",
                    "tags": ["头像", "个人资料"],
                    "is_public": "false",
                }
            ]
        }
    }


class MediaFileUpdate(BaseModel):
    """更新媒体文件的请求模型（所有字段可选）"""

    usage: Optional[FileUsage] = Field(None, description="文件用途")
    description: Optional[str] = Field(None, max_length=500, description="文件描述")
    alt_text: Optional[str] = Field(None, max_length=255, description="替代文本")
    tags: Optional[list[str]] = Field(None, description="标签列表")
    is_public: Optional[bool] = Field(None, description="是否公开")


class MediaFileQuery(BaseModel):
    """媒体文件查询参数"""

    media_type: Optional[MediaType] = Field(None, description="媒体类型过滤")
    usage: Optional[FileUsage] = Field(None, description="用途过滤")
    tags: Optional[list[str]] = Field(None, description="标签过滤")
    limit: int = Field(50, ge=1, le=100, description="限制数量")
    offset: int = Field(0, ge=0, description="偏移量")


# ========================================
# 响应模型（返回给客户端的数据）
# ========================================


class ThumbnailInfo(BaseModel):
    """缩略图信息"""

    small: Optional[HttpUrl] = Field(None, description="小尺寸缩略图URL")
    medium: Optional[HttpUrl] = Field(None, description="中等尺寸缩略图URL")
    large: Optional[HttpUrl] = Field(None, description="大尺寸缩略图URL")
    xlarge: Optional[HttpUrl] = Field(None, description="超大尺寸缩略图URL")


class MediaFileResponse(MediaFileBase):
    """媒体文件响应模型"""

    id: uuid.UUID = Field(..., description="文件ID")
    file_path: str = Field(..., description="文件存储路径")
    file_size: int = Field(..., description="文件大小（字节）")
    mime_type: str = Field(..., description="MIME类型")
    media_type: MediaType = Field(..., description="媒体类型")

    # 媒体元数据
    width: Optional[int] = Field(None, description="宽度（像素）")
    height: Optional[int] = Field(None, description="高度（像素）")
    duration: Optional[float] = Field(None, description="时长（秒，视频用）")

    # 处理状态
    is_processing: bool = Field(False, description="是否正在处理中")

    # 统计信息
    view_count: int = Field(0, description="查看次数")
    download_count: int = Field(0, description="下载次数")

    # 关联信息
    uploader_id: uuid.UUID = Field(..., description="上传者ID")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    # URL信息
    file_url: HttpUrl = Field(..., description="文件访问URL")
    thumbnails: Optional[ThumbnailInfo] = Field(None, description="缩略图URL")

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "original_filename": "photo.jpg",
                    "file_path": "uploads/user123/abc123.jpg",
                    "file_size": 1024000,
                    "mime_type": "image/jpeg",
                    "media_type": "image",
                    "usage": "avatar",
                    "width": 1920,
                    "height": 1080,
                    "file_url": "http://localhost:8000/media/uploads/user123/abc123.jpg",
                    "created_at": "2025-12-24T10:00:00",
                }
            ]
        },
    }


class MediaFileListResponse(BaseModel):
    """媒体文件列表响应模型"""

    total: int = Field(..., description="总数")
    files: list[MediaFileResponse] = Field(..., description="文件列表")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "total": 25,
                    "files": [
                        {
                            "id": "123e4567-e89b-12d3-a456-426614174000",
                            "original_filename": "photo.jpg",
                            "media_type": "image",
                            "file_size": 1024000,
                        }
                    ],
                }
            ]
        }
    }


class MediaFileUploadResponse(BaseModel):
    """文件上传响应模型"""

    message: str = Field(..., description="上传结果消息")
    file: MediaFileResponse = Field(..., description="上传的文件信息")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "message": "文件上传成功",
                    "file": {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "original_filename": "photo.jpg",
                        "file_url": "http://localhost:8000/media/uploads/user123/abc123.jpg",
                    },
                }
            ]
        }
    }


class BatchDeleteRequest(BaseModel):
    """批量删除请求模型"""

    file_ids: list[uuid.UUID] = Field(
        ..., min_length=1, description="要删除的文件ID列表"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "file_ids": [
                        "123e4567-e89b-12d3-a456-426614174000",
                        "987fcdeb-51a2-43d1-9f12-123456789abc",
                    ]
                }
            ]
        }
    }


class BatchDeleteResponse(BaseModel):
    """批量删除响应模型"""

    message: str = Field(..., description="删除结果消息")
    deleted_count: int = Field(..., description="成功删除的文件数量")

    model_config = {
        "json_schema_extra": {
            "examples": [{"message": "批量删除完成", "deleted_count": 2}]
        }
    }


class ThumbnailRegenerateResponse(BaseModel):
    """缩略图重新生成响应模型"""

    message: str = Field(..., description="处理结果消息")
    thumbnails: ThumbnailInfo = Field(..., description="新生成的缩略图URL")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "message": "缩略图重新生成成功",
                    "thumbnails": {
                        "small": "http://localhost:8000/media/thumbnails/user123/small_abc123.webp",
                        "medium": "http://localhost:8000/media/thumbnails/user123/medium_abc123.webp",
                    },
                }
            ]
        }
    }


# ========================================
# 公开文件查询参数
# ========================================


class PublicMediaFilesParams(BaseModel):
    """公开文件查询参数"""

    media_type: Optional[MediaType] = Field(None, description="媒体类型过滤")
    usage: Optional[FileUsage] = Field(None, description="用途过滤")
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页数量")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "media_type": "image",
                    "usage": "general",
                    "page": 1,
                    "page_size": 20,
                }
            ]
        }
    }


class TogglePublicityRequest(BaseModel):
    """切换公开状态请求"""

    is_public: bool = Field(..., description="是否公开")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"is_public": True},
                {"is_public": False},
            ]
        }
    }


# ========================================
# 媒体文件过滤器
# ========================================


class MediaFileFilters(BaseModel):
    """媒体文件查询过滤器"""

    media_type: Optional[MediaType] = Field(None, description="媒体类型")
    usage: Optional[FileUsage] = Field(None, description="文件用途")
    is_public: Optional[bool] = Field(None, description="是否公开")
    is_processing: Optional[bool] = Field(None, description="是否处理中")
    file_size_min: Optional[int] = Field(None, ge=0, description="最小文件大小（字节）")
    file_size_max: Optional[int] = Field(None, ge=0, description="最大文件大小（字节）")
    created_after: Optional[datetime] = Field(None, description="创建时间起始")
    created_before: Optional[datetime] = Field(None, description="创建时间结束")
    tags: Optional[list[str]] = Field(None, description="标签列表")
    search_query: Optional[str] = Field(None, max_length=100, description="搜索关键词")
    sort_by: str = Field("created_at", description="排序字段")
    sort_order: str = Field("desc", pattern="^(asc|desc)$", description="排序方向")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "media_type": "image",
                    "usage": "general",
                    "is_public": True,
                    "file_size_max": 5242880,  # 5MB
                    "tags": ["work", "important"],
                    "sort_by": "created_at",
                    "sort_order": "desc",
                }
            ]
        }
    }


class MediaFileListParams(BaseModel):
    """媒体文件列表查询参数"""

    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页数量")
    filters: Optional[MediaFileFilters] = Field(None, description="过滤条件")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "page": 1,
                    "page_size": 20,
                    "filters": {
                        "media_type": "image",
                        "is_public": True,
                    },
                }
            ]
        }
    }
