from typing import Optional
from uuid import UUID

from app.core.config import settings
from app.media.schemas import MediaFileResponse
from app.posts.model import PostType
from pydantic import BaseModel, ConfigDict, Field, computed_field


class CategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=100)
    description: Optional[str] = ""
    parent_id: Optional[UUID] = None
    is_active: bool = True
    sort_order: int = 0
    icon_id: Optional[UUID] = None
    cover_media_id: Optional[UUID] = None
    icon_preset: Optional[str] = None
    post_type: PostType = PostType.ARTICLES


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[UUID] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    icon_id: Optional[UUID] = None
    cover_media_id: Optional[UUID] = None
    icon_preset: Optional[str] = None
    post_type: Optional[PostType] = None


class CategoryResponse(CategoryBase):
    id: UUID
    cover_media: Optional[MediaFileResponse] = None
    post_count: int = 0

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def cover_image(self) -> Optional[str]:
        """获取封面图 URL"""
        if self.cover_media_id:
            return f"{settings.API_PREFIX}/media/{self.cover_media_id}/thumbnail/medium"
        return None
