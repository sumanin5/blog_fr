from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TagBase(BaseModel):
    name: str = Field(..., max_length=50)
    slug: str = Field(..., max_length=50)
    color: str = Field("#6c757d", max_length=7)
    description: Optional[str] = None


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None


class TagResponse(TagBase):
    id: UUID
    post_count: int = 0  # 统计关联文章数
    model_config = ConfigDict(from_attributes=True)


class TagCleanupResponse(BaseModel):
    """标签清理结果响应"""

    deleted_count: int
    deleted_tags: List[str]
    message: str


class TagMergeRequest(BaseModel):
    """标签合并请求"""

    source_tag_id: UUID
    target_tag_id: UUID
