"""
文章模块 Schema 入口

兼容旧版本引用方式，但实际上逻辑已拆分到 schemas 包中。
建议后续直接引用 app.posts.schemas.*
"""

from app.posts.schemas import (  # noqa: F401
    CategoryBase,
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    PostBase,
    PostBookmarkResponse,
    PostCreate,
    PostDetailResponse,
    PostLikeResponse,
    PostListResponse,
    PostPreviewRequest,
    PostPreviewResponse,
    PostShortResponse,
    PostTypeResponse,
    PostUpdate,
    PostVersionResponse,
    TagBase,
    TagCleanupResponse,
    TagCreate,
    TagMergeRequest,
    TagResponse,
    TagUpdate,
)

__all__ = [
    "CategoryBase",
    "CategoryCreate",
    "CategoryResponse",
    "CategoryUpdate",
    "PostBase",
    "PostBookmarkResponse",
    "PostCreate",
    "PostDetailResponse",
    "PostLikeResponse",
    "PostListResponse",
    "PostPreviewRequest",
    "PostPreviewResponse",
    "PostShortResponse",
    "PostTypeResponse",
    "PostUpdate",
    "PostVersionResponse",
    "TagBase",
    "TagCleanupResponse",
    "TagCreate",
    "TagMergeRequest",
    "TagResponse",
    "TagUpdate",
]
