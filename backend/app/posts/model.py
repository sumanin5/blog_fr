"""
文章模块数据库模型

定义分类、标签和文章的数据库表结构
"""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from app.core.base import Base
from sqlmodel import (
    JSON,
    TEXT,
    Boolean,
    Column,
    Field,
    Relationship,
    SQLModel,
    UniqueConstraint,
)

if TYPE_CHECKING:
    from app.media.model import MediaFile
    from app.users.model import User


class PostType(str, Enum):
    """内容类型枚举"""

    ARTICLE = "article"
    IDEA = "idea"


class PostStatus(str, Enum):
    """文章状态枚举"""

    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class PostTagLink(SQLModel, table=True):
    """文章与标签的多对多中间表"""

    __tablename__ = "posts_post_tag_link"

    post_id: UUID = Field(foreign_key="posts_post.id", primary_key=True)
    tag_id: UUID = Field(foreign_key="posts_tag.id", primary_key=True)


class Category(Base, table=True):
    """分类模型"""

    __tablename__ = "posts_category"

    name: str = Field(max_length=100, description="分类名称")
    slug: str = Field(max_length=100, index=True, description="URL别名")
    # ... 其他字段保持不变
    description: str = Field(default="", description="分类描述")
    parent_id: Optional[UUID] = Field(
        default=None, foreign_key="posts_category.id", description="父分类ID"
    )
    is_active: bool = Field(default=True, description="是否启用")
    sort_order: int = Field(default=0, description="排序")
    icon_id: Optional[UUID] = Field(
        default=None, foreign_key="media_files.id", description="分类图标ID"
    )
    icon_preset: Optional[str] = Field(
        default=None, max_length=50, description="图标（预设）"
    )
    post_type: PostType = Field(
        default=PostType.ARTICLE, index=True, description="所属内容类型"
    )

    __table_args__ = (
        UniqueConstraint("slug", "post_type", name="uq_category_slug_post_type"),
    )

    # 关系字段
    parent: Optional["Category"] = Relationship(
        back_populates="children", sa_relationship_kwargs={"remote_side": "Category.id"}
    )
    children: list["Category"] = Relationship(back_populates="parent")
    posts: list["Post"] = Relationship(back_populates="category")
    icon: Optional["MediaFile"] = Relationship()

    def __repr__(self) -> str:
        return f"Category(name={self.name!r}, slug={self.slug!r})"


class Tag(Base, table=True):
    """标签模型"""

    __tablename__ = "posts_tag"

    name: str = Field(max_length=50, unique=True, description="标签名称")
    slug: str = Field(max_length=50, unique=True, index=True, description="URL别名")
    color: str = Field(max_length=7, default="#6c757d", description="标签颜色")
    description: str = Field(default="", description="标签描述")

    # 关系字段
    posts: list["Post"] = Relationship(back_populates="tags", link_model=PostTagLink)

    def __repr__(self) -> str:
        return f"Tag(name={self.name!r}, slug={self.slug!r})"


class Post(Base, table=True):
    """文章模型"""

    __tablename__ = "posts_post"

    post_type: PostType = Field(
        default=PostType.ARTICLE, index=True, description="内容类型"
    )
    title: str = Field(max_length=200, description="标题")
    slug: str = Field(max_length=200, unique=True, index=True, description="URL别名")

    # 内容字段
    excerpt: str = Field(default="", max_length=500, description="摘要")
    content_mdx: str = Field(
        sa_column=Column(TEXT), description="正文(MDX - 支持 Markdown + JSX)"
    )
    content_html: str = Field(
        sa_column=Column(TEXT), description="正文预览(HTML)，用于 SEO 和摘要"
    )
    enable_jsx: bool = Field(
        default=False,
        sa_column=Column(Boolean, server_default="false", nullable=False),
        description="是否启用 JSX 组件（true=前端渲染，false=后端渲染）",
    )

    # 状态与属性
    status: PostStatus = Field(default=PostStatus.DRAFT, index=True, description="状态")
    is_featured: bool = Field(default=False, description="是否推荐")
    allow_comments: bool = Field(default=True, description="允许评论")

    # 统计字段
    view_count: int = Field(default=0, description="浏览量")
    like_count: int = Field(default=0, description="点赞数")
    bookmark_count: int = Field(default=0, description="收藏数")
    reading_time: int = Field(default=0, description="预计阅读时间(分钟)")

    # 预处理数据
    toc: list = Field(
        default_factory=list,
        sa_column=Column(JSON),
        description="文章目录结构(JSON数组)",
    )

    # SEO 字段
    meta_title: str = Field(default="", max_length=200, description="SEO标题")
    meta_description: str = Field(default="", max_length=300, description="SEO描述")
    meta_keywords: str = Field(default="", max_length=200, description="关键词")

    # 时间字段
    published_at: Optional[datetime] = Field(default=None, description="发布时间")

    # Git 追踪字段 (用于同步模式)
    git_hash: Optional[str] = Field(
        default=None, max_length=50, description="Git Commit ID"
    )
    source_path: Optional[str] = Field(
        default=None, max_length=500, description="源文件路径"
    )

    # 关联信息
    author_id: UUID = Field(foreign_key="users.id", description="作者ID")
    category_id: Optional[UUID] = Field(
        default=None, foreign_key="posts_category.id", description="分类ID"
    )
    cover_media_id: Optional[UUID] = Field(
        default=None, foreign_key="media_files.id", description="封面图(媒体库)ID"
    )

    # 关系字段
    author: "User" = Relationship(back_populates="posts")
    category: Optional["Category"] = Relationship(back_populates="posts")
    tags: list["Tag"] = Relationship(back_populates="posts", link_model=PostTagLink)
    cover_media: Optional["MediaFile"] = Relationship()
    versions: list["PostVersion"] = Relationship(
        back_populates="post", cascade_delete=True
    )

    def __repr__(self) -> str:
        return f"Post(title={self.title!r}, slug={self.slug!r}, status={self.status!r})"


class PostVersion(Base, table=True):
    """文章版本快照模型"""

    __tablename__ = "posts_post_version"

    post_id: UUID = Field(foreign_key="posts_post.id", index=True, description="文章ID")
    version_num: int = Field(default=1, description="版本号")

    # 快照内容
    title: str = Field(max_length=200, description="快照标题")
    content_mdx: str = Field(sa_column=Column(TEXT), description="快照正文")

    # 元数据
    git_hash: Optional[str] = Field(default=None, max_length=50, description="Git Hash")
    commit_message: Optional[str] = Field(
        default=None, max_length=500, description="提交信息"
    )

    # 关系字段
    post: "Post" = Relationship(back_populates="versions")

    def __repr__(self) -> str:
        return f"PostVersion(post_id={self.post_id}, version={self.version_num})"
