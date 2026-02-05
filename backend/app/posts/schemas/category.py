from typing import Optional
from uuid import UUID

from app.core.config import settings
from app.media.schemas import MediaFileResponse
from app.posts.model import PostSortOrder, PostType
from pydantic import BaseModel, ConfigDict, Field, computed_field


class CategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=100)
    description: Optional[str] = ""
    excerpt: Optional[str] = ""
    parent_id: Optional[UUID] = None
    is_active: bool = True
    sort_order: int = 0
    icon_id: Optional[UUID] = None
    cover_media_id: Optional[UUID] = None
    icon_preset: Optional[str] = None
    is_featured: bool = False
    post_type: PostType = PostType.ARTICLES
    post_sort_order: PostSortOrder = PostSortOrder.PUBLISHED_AT_DESC


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    excerpt: Optional[str] = None
    parent_id: Optional[UUID] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    icon_id: Optional[UUID] = None
    cover_media_id: Optional[UUID] = None
    icon_preset: Optional[str] = None
    is_featured: Optional[bool] = None
    post_type: Optional[PostType] = None
    post_sort_order: Optional[PostSortOrder] = None


class CategorySimpleResponse(CategoryBase):
    """精简版分类响应 (用于嵌套在文章列表等场景，避免循环引用和过度查询)"""

    id: UUID
    model_config = ConfigDict(from_attributes=True)


class CategoryResponse(CategorySimpleResponse):
    """完整版分类响应 (包含关联对象和计算属性)"""

    cover_media: Optional[MediaFileResponse] = None
    icon: Optional[MediaFileResponse] = None
    post_count: int = 0

    @computed_field
    @property
    def cover_image(self) -> Optional[str]:
        """获取封面图 URL（xlarge 尺寸，适合详情页全屏 banner）"""
        if self.cover_media_id:
            return f"{settings.API_PREFIX}/media/{self.cover_media_id}/thumbnail/xlarge"
        return None
