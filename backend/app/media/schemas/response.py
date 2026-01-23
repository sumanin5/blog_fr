"""响应 Schema 模型"""

from pydantic import BaseModel, Field

from .base import MediaFileResponse


class MediaFileListResponse(BaseModel):
    """媒体文件列表响应模型"""

    total: int = Field(..., description="总数")
    files: list[MediaFileResponse] = Field(..., description="文件列表")


class MediaFileUploadResponse(BaseModel):
    """文件上传响应模型"""

    message: str = Field(..., description="上传结果消息")
    file: MediaFileResponse = Field(..., description="上传的文件信息")


class BatchDeleteResponse(BaseModel):
    """批量删除响应模型"""

    message: str = Field(..., description="删除结果消息")
    deleted_count: int = Field(..., description="成功删除的文件数量")


class ThumbnailRegenerateResponse(BaseModel):
    """缩略图重新生成响应模型"""

    message: str = Field(..., description="处理结果消息")
    thumbnails: dict[str, str] = Field(..., description="新生成的缩略图URL")
