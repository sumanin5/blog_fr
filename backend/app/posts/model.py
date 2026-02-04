"""
文章模块数据库模型

定义分类、标签和文章的数据库表结构
"""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from app.core.base import Base
from sqlalchemy import Column
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import (
    JSON,
    TEXT,
    Boolean,
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

    ARTICLES = "articles"
    IDEAS = "ideas"


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
    excerpt: str = Field(default="", max_length=100, description="摘要")
    description: str = Field(default="", description="分类描述")
    parent_id: Optional[UUID] = Field(
        default=None, foreign_key="posts_category.id", description="父分类ID"
    )
    is_active: bool = Field(default=True, description="是否启用")
    sort_order: int = Field(default=0, description="排序")
    # ... (existing fields)
    icon_id: Optional[UUID] = Field(
        default=None, foreign_key="media_files.id", description="分类图标ID"
    )
    cover_media_id: Optional[UUID] = Field(
        default=None, foreign_key="media_files.id", description="分类封面图ID"
    )
    icon_preset: Optional[str] = Field(
        default=None, max_length=50, description="图标（预设）"
    )
    is_featured: bool = Field(default=False, description="是否在首页推荐")
    post_type: PostType = Field(
        sa_column=Column(
            SQLAlchemyEnum(
                PostType, values_callable=lambda obj: [e.value for e in obj]
            ),
            index=True,
            nullable=False,
            default=PostType.ARTICLES,
        ),
        description="所属内容类型",
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

    # 指向 MediaFile 的关系，需要明确指定 foreign_keys 以消除歧义
    icon: Optional["MediaFile"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "Category.icon_id"}
    )
    cover_media: Optional["MediaFile"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "Category.cover_media_id"}
    )

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
        sa_column=Column(
            SQLAlchemyEnum(
                PostType, values_callable=lambda obj: [e.value for e in obj]
            ),
            index=True,
            nullable=False,
            default=PostType.ARTICLES,
        ),
        description="内容类型",
    )
    title: str = Field(max_length=200, description="标题")
    slug: str = Field(max_length=200, unique=True, index=True, description="URL别名")

    # 内容字段
    excerpt: str = Field(default="", max_length=500, description="摘要")
    content_mdx: str = Field(
        sa_column=Column(TEXT), description="正文(MDX - 支持 Markdown + JSX)"
    )
    content_ast: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSONB),
        description="AST 结构化内容（JSONB），用于高性能渲染",
    )
    enable_jsx: bool = Field(
        default=False,
        sa_column=Column(Boolean, server_default="false", nullable=False),
        description="是否启用 JSX 组件（true=支持交互式组件，false=纯 Markdown）",
    )
    use_server_rendering: bool = Field(
        default=True,
        sa_column=Column(Boolean, server_default="true", nullable=False),
        description="是否使用服务端渲染 MDX（true=服务端，false=客户端）",
    )

    # 状态与属性
    status: PostStatus = Field(
        sa_column=Column(
            SQLAlchemyEnum(
                PostStatus, values_callable=lambda obj: [e.value for e in obj]
            ),
            index=True,
            nullable=False,
            default=PostStatus.DRAFT,
        ),
        description="状态",
    )
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
        default=None, max_length=500, index=True, description="源文件路径"
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
