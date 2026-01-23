"""基础 Schema 模型"""

import uuid
from datetime import datetime
from typing import Optional

from app.core.config import settings
from app.media.model import FileUsage, MediaType
from pydantic import BaseModel, Field, computed_field


class MediaFileBase(BaseModel):
    """媒体文件基础模型（共享字段）"""

    original_filename: str = Field(..., max_length=255, description="原始文件名")
    usage: FileUsage = Field(FileUsage.GENERAL, description="文件用途")
    description: str = Field("", max_length=500, description="文件描述")
    alt_text: str = Field("", max_length=255, description="替代文本（图片用）")
    tags: list[str] = Field(default_factory=list, description="标签列表")


class MediaFileResponse(MediaFileBase):
    """媒体文件响应模型"""

    id: uuid.UUID = Field(..., description="文件ID")
    file_path: str = Field(..., description="文件存储路径")
    file_size: int = Field(..., description="文件大小（字节）")
    mime_type: str = Field(..., description="MIME类型")
    media_type: MediaType = Field(..., description="媒体类型")

    width: Optional[int] = Field(None, description="宽度（像素）")
    height: Optional[int] = Field(None, description="高度（像素）")
    duration: Optional[float] = Field(None, description="时长（秒，视频用）")

    is_public: bool = Field(False, description="是否公开")
    is_processing: bool = Field(False, description="是否正在处理中")

    view_count: int = Field(0, description="查看次数")
    download_count: int = Field(0, description="下载次数")

    uploader_id: uuid.UUID = Field(..., description="上传者ID")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    thumbnails_raw: Optional[dict[str, str]] = Field(
        None, alias="thumbnails", exclude=True
    )

    @computed_field
    @property
    def file_url(self) -> str:
        """文件访问 URL（带权限检查）"""
        return f"{settings.BASE_URL}{settings.API_PREFIX}/media/{self.id}/view"

    @computed_field
    @property
    def thumbnails(self) -> Optional[dict[str, str]]:
        """缩略图完整 URL 字典"""
        if not self.thumbnails_raw:
            return None
        return {
            size: f"{settings.MEDIA_URL}{path}"
            for size, path in self.thumbnails_raw.items()
        }

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
    }
