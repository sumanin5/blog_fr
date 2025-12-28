"""
媒体文件数据库模型

定义媒体文件相关的数据库表结构
"""

from enum import Enum
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from app.core.base import Base
from sqlmodel import JSON, Column, Field, Relationship

if TYPE_CHECKING:
    from app.posts.model import Category, Post
    from app.users.model import User


# 媒体类型枚举
class MediaType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"
    OTHER = "other"


# 文件用途枚举
class FileUsage(str, Enum):
    GENERAL = "general"  # 通用文件
    AVATAR = "avatar"  # 用户头像
    COVER = "cover"  # 封面图
    ICON = "icon"  # UI图标
    FAVICON = "favicon"  # 网站图标
    DOCUMENT = "document"  # 文档
    ATTACHMENT = "attachment"  # 附件


class MediaFile(Base, table=True):
    """
    媒体文件表

    存储所有上传的媒体文件信息，包括图片、视频、文档等
    """

    __tablename__ = "media_files"

    # 基本文件信息
    original_filename: str = Field(max_length=255, description="原始文件名")
    file_path: str = Field(
        max_length=500, unique=True, index=True, description="文件存储路径"
    )
    file_size: int = Field(ge=0, description="文件大小（字节）")
    mime_type: str = Field(max_length=100, description="MIME类型")

    # 分类信息
    media_type: MediaType = Field(description="媒体类型")
    usage: FileUsage = Field(
        default=FileUsage.GENERAL, index=True, description="文件用途"
    )

    # 媒体元数据（图片/视频特有）
    width: Optional[int] = Field(default=None, ge=0, description="宽度（像素）")
    height: Optional[int] = Field(default=None, ge=0, description="高度（像素）")
    duration: Optional[float] = Field(
        default=None, ge=0, description="时长（秒，视频用）"
    )

    # 缩略图路径（JSON存储多个尺寸）
    thumbnails: dict = Field(
        default_factory=dict,
        sa_column=Column(JSON),
        description="缩略图路径集合 {size: path}",
    )

    # 描述信息
    description: str = Field(default="", description="文件描述")
    alt_text: str = Field(default="", max_length=255, description="替代文本（图片用）")
    tags: list[str] = Field(
        default_factory=list, sa_column=Column(JSON), description="标签列表"
    )

    # 处理状态
    is_processing: bool = Field(default=False, description="是否正在处理中")

    # 是否共享
    is_public: bool = Field(default=False, description="是否共享")

    # 统计信息
    view_count: int = Field(default=0, ge=0, description="查看次数")
    download_count: int = Field(default=0, ge=0, description="下载次数")

    # 关联信息
    uploader_id: UUID = Field(foreign_key="users.id", description="上传者ID")

    # 关系字段
    uploader: "User" = Relationship(back_populates="media_files")
    categories_as_icon: list["Category"] = Relationship(back_populates="icon")
    posts_as_cover: list["Post"] = Relationship(back_populates="cover_media")

    def __repr__(self) -> str:
        return f"MediaFile(id={self.id!r}, filename={self.original_filename!r}, type={self.media_type!r})"

    __str__ = __repr__

    @property
    def is_image(self) -> bool:
        """是否为图片文件"""
        return self.media_type == MediaType.IMAGE

    @property
    def is_video(self) -> bool:
        """是否为视频文件"""
        return self.media_type == MediaType.VIDEO

    @property
    def has_thumbnails(self) -> bool:
        """是否有缩略图"""
        return bool(self.thumbnails)

    def get_thumbnail_url(self, size: str = "medium") -> Optional[str]:
        """获取指定尺寸的缩略图URL"""
        return self.thumbnails.get(size)
