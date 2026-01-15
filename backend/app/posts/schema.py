"""
文章模块数据架构 (Schemas)

定义 Pydantic 模型用于请求验证和响应序列化
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from app.core.config import settings
from app.posts.model import PostStatus, PostType
from app.users.schema import UserResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator

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
    post_count: int = 0  # 统计关联文章数
    model_config = ConfigDict(from_attributes=True)


class TagMergeRequest(BaseModel):
    """标签合并请求"""

    source_tag_id: UUID
    target_tag_id: UUID


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
    slug: Optional[str] = None  # 如果不填，后端自动生成 base-slug-xxxxxx 格式
    post_type: PostType = PostType.ARTICLE
    status: PostStatus = PostStatus.DRAFT
    category_id: Optional[UUID] = None
    cover_media_id: Optional[UUID] = None
    is_featured: bool = False
    allow_comments: bool = True
    enable_jsx: bool = False  # 是否启用 JSX 组件
    use_server_rendering: bool = True  # 是否使用服务端渲染

    # SEO 字段
    meta_title: Optional[str] = ""
    meta_description: Optional[str] = ""
    meta_keywords: Optional[str] = ""


class PostCreate(PostBase):
    content_mdx: str = Field(..., description="原始 MDX 内容")
    excerpt: Optional[str] = None  # 允许用户手动指定摘要
    tags: Optional[List[str]] = None  # 允许用户通过 API 传入标签名称列表
    git_hash: Optional[str] = None
    source_path: Optional[str] = None
    commit_message: Optional[str] = None

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """验证标签列表"""
        if v is None:
            return v

        # 限制标签数量
        if len(v) > 20:
            raise ValueError("标签数量不能超过20个")

        # 验证每个标签的长度
        validated_tags = []
        for tag in v:
            tag = tag.strip()
            if not tag:
                continue
            if len(tag) > 50:
                raise ValueError(f'标签名不能超过50个字符: "{tag[:20]}..."')
            validated_tags.append(tag)

        return validated_tags


class PostUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    post_type: Optional[PostType] = None
    status: Optional[PostStatus] = None
    category_id: Optional[UUID] = None
    cover_media_id: Optional[UUID] = None
    is_featured: Optional[bool] = None
    allow_comments: Optional[bool] = None
    enable_jsx: Optional[bool] = None
    use_server_rendering: Optional[bool] = None
    content_mdx: Optional[str] = None
    excerpt: Optional[str] = None  # 允许用户更新摘要
    tags: Optional[List[str]] = None  # 允许用户更新标签
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    git_hash: Optional[str] = None
    source_path: Optional[str] = None
    commit_message: Optional[str] = None

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """验证标签列表"""
        if v is None:
            return v

        # 限制标签数量
        if len(v) > 20:
            raise ValueError("标签数量不能超过20个")

        # 验证每个标签的长度
        validated_tags = []
        for tag in v:
            tag = tag.strip()
            if not tag:
                continue
            if len(tag) > 50:
                raise ValueError(f'标签名不能超过50个字符: "{tag[:20]}..."')
            validated_tags.append(tag)

        return validated_tags


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
    cover_media_id: Optional[UUID] = None  # 封面图 ID

    # 关联对象（需要预加载）
    author: Optional["UserResponse"] = None  # 作者信息
    category: Optional[CategoryResponse] = None
    tags: List[TagResponse] = []
    cover_media: Optional["MediaFileResponse"] = None  # 封面图完整信息

    # 追踪信息
    git_hash: Optional[str] = None
    source_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @property
    def cover_thumbnail(self) -> Optional[str]:
        """获取缩略图 URL（列表页用 small 尺寸）"""
        if self.cover_media_id:
            return f"{settings.API_PREFIX}/media/{self.cover_media_id}/thumbnail/medium"
        return None


class PostDetailResponse(PostShortResponse):
    """文章详情响应

    优化说明：
    - 根据 enable_jsx 字段，只返回需要的内容字段
    - enable_jsx=False: 只返回 content_html（节省 50% 带宽）
    - enable_jsx=True: 只返回 content_mdx（节省 50% 带宽）
    """

    content_mdx: Optional[str] = None
    content_html: Optional[str] = None
    enable_jsx: bool = False
    use_server_rendering: bool = True
    toc: list  # 目录数组，格式: [{"id": "...", "title": "...", "level": 1}, ...]

    # 追踪信息
    git_hash: Optional[str] = None
    source_path: Optional[str] = None

    # 版本记录
    versions: List[PostVersionResponse] = []

    model_config = ConfigDict(from_attributes=True)

    def model_post_init(self, __context) -> None:
        """初始化后处理：根据 enable_jsx 清空不需要的字段"""
        if self.enable_jsx:
            # 使用 MDX，清空 HTML
            self.content_html = None
        else:
            # 使用 HTML，清空 MDX
            self.content_mdx = None

    @property
    def cover_image(self) -> Optional[str]:
        """获取封面图 URL（详情页用 xlarge 尺寸）"""
        if self.cover_media_id:
            return f"{settings.API_PREFIX}/media/{self.cover_media_id}/thumbnail/xlarge"
        return None


class PostListResponse(BaseModel):
    items: List[PostShortResponse]
    total: int
    limit: int
    offset: int


class PostPreviewRequest(BaseModel):
    """文章预览请求"""

    content_mdx: str = Field(..., description="要预览的 MDX 内容")


class PostPreviewResponse(BaseModel):
    """文章预览响应"""

    content_html: str
    toc: list
    reading_time: int
    excerpt: str


# 延迟导入避免循环依赖
from app.media.schema import MediaFileResponse  # noqa: E402

# 解析延迟引用（Pydantic v2）
PostShortResponse.model_rebuild()
PostDetailResponse.model_rebuild()
