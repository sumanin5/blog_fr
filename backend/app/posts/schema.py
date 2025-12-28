"""
文章模块数据架构 (Schemas)

定义 Pydantic 模型用于请求验证和响应序列化
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from app.posts.model import PostStatus, PostType
from pydantic import BaseModel, ConfigDict, Field

# ========================================
# 标签 (Tag) Schemas
# ========================================


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
    model_config = ConfigDict(from_attributes=True)


# ========================================
# 分类 (Category) Schemas
# ========================================


class CategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=100)
    description: Optional[str] = ""
    parent_id: Optional[UUID] = None
    is_active: bool = True
    sort_order: int = 0
    icon_id: Optional[UUID] = None
    icon_preset: Optional[str] = None
    post_type: PostType = PostType.ARTICLE


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


# ========================================
# 文章 (Post) Schemas
# ========================================


class PostBase(BaseModel):
    title: str = Field(..., max_length=200)
    slug: Optional[str] = None  # 如果不填，后端自动根据标题生成
    post_type: PostType = PostType.ARTICLE
    status: PostStatus = PostStatus.DRAFT
    category_id: Optional[UUID] = None
    cover_media_id: Optional[UUID] = None
    is_featured: bool = False
    allow_comments: bool = True

    # SEO 字段
    meta_title: Optional[str] = ""
    meta_description: Optional[str] = ""
    meta_keywords: Optional[str] = ""


class PostCreate(PostBase):
    content_mdx: str = Field(..., description="原始 MDX 内容")
    git_hash: Optional[str] = None
    source_path: Optional[str] = None
    commit_message: Optional[str] = None


class PostUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    post_type: Optional[PostType] = None
    status: Optional[PostStatus] = None
    category_id: Optional[UUID] = None
    cover_media_id: Optional[UUID] = None
    is_featured: Optional[bool] = None
    allow_comments: Optional[bool] = None
    content_mdx: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    git_hash: Optional[str] = None
    source_path: Optional[str] = None
    commit_message: Optional[str] = None


class PostVersionResponse(BaseModel):
    """文章版本响应"""

    id: UUID
    version_num: int
    title: str
    git_hash: Optional[str] = None
    commit_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PostShortResponse(PostBase):
    """用于列表展示的精简响应，规避 N+1 风险"""

    id: UUID
    slug: str
    excerpt: str
    reading_time: int
    view_count: int
    like_count: int
    comment_count: int = 0
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None

    # 关联 ID
    author_id: UUID

    # 精简关联对象 (由 Service 层决定是否填充)
    category: Optional[CategoryResponse] = None
    tags: List[TagResponse] = []

    model_config = ConfigDict(from_attributes=True)


class PostDetailResponse(PostShortResponse):
    """文章详情响应"""

    content_mdx: str
    content_html: str
    toc: dict

    # 追踪信息
    git_hash: Optional[str] = None
    source_path: Optional[str] = None

    # 版本记录
    versions: List[PostVersionResponse] = []

    model_config = ConfigDict(from_attributes=True)


class PostListResponse(BaseModel):
    items: List[PostShortResponse]
    total: int
    limit: int
    offset: int
