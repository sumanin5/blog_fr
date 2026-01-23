"""请求 Schema 模型"""

import uuid
from datetime import datetime
from typing import Optional

from app.media.model import FileUsage, MediaType
from pydantic import BaseModel, Field


class MediaFileUpload(BaseModel):
    """文件上传请求模型"""

    usage: FileUsage = Field(FileUsage.GENERAL, description="文件用途")
    description: str = Field("", max_length=500, description="文件描述")
    alt_text: str = Field("", max_length=255, description="替代文本（图片用）")
    tags: list[str] = Field(default_factory=list, description="标签列表")
    is_public: bool = Field(False, description="是否公开")


class MediaFileUpdate(BaseModel):
    """更新媒体文件的请求模型（所有字段可选）"""

    original_filename: Optional[str] = Field(
        None, max_length=255, description="原始文件名"
    )
    usage: Optional[FileUsage] = Field(None, description="文件用途")
    description: Optional[str] = Field(None, max_length=500, description="文件描述")
    alt_text: Optional[str] = Field(None, max_length=255, description="替代文本")
    tags: Optional[list[str]] = Field(None, description="标签列表")
    is_public: Optional[bool] = Field(None, description="是否公开")


class MediaFileQuery(BaseModel):
    """媒体文件查询参数"""

    q: Optional[str] = Field(None, description="搜索关键词(文件名/描述)")
    media_type: Optional[MediaType] = Field(None, description="媒体类型过滤")
    usage: Optional[FileUsage] = Field(None, description="用途过滤")
    tags: Optional[list[str]] = Field(None, description="标签过滤")
    limit: int = Field(50, ge=1, le=100, description="限制数量")
    offset: int = Field(0, ge=0, description="偏移量")


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


class MediaFileListParams(BaseModel):
    """媒体文件列表查询参数"""

    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页数量")
    filters: Optional[MediaFileFilters] = Field(None, description="过滤条件")


class PublicMediaFilesParams(BaseModel):
    """公开文件查询参数"""

    media_type: Optional[MediaType] = Field(None, description="媒体类型过滤")
    usage: Optional[FileUsage] = Field(None, description="用途过滤")
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页数量")


class BatchDeleteRequest(BaseModel):
    """批量删除请求模型"""

    file_ids: list[uuid.UUID] = Field(
        ..., min_length=1, description="要删除的文件ID列表"
    )


class TogglePublicityRequest(BaseModel):
    """切换公开状态请求"""

    is_public: bool = Field(..., description="是否公开")
