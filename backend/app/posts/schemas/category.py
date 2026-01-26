from typing import Optional
from uuid import UUID

from app.posts.model import PostType
from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=100)
    description: Optional[str] = ""
    parent_id: Optional[UUID] = None
    is_active: bool = True
    sort_order: int = 0
    icon_id: Optional[UUID] = None
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
    icon_preset: Optional[str] = None
    post_type: Optional[PostType] = None


class CategoryResponse(CategoryBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)
