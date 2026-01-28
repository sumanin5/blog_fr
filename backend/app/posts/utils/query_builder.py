"""
查询构建器

提供文章、分类、标签的查询构建函数
"""

from typing import Optional
from uuid import UUID

from app.posts.model import Post, PostStatus, PostType, Tag
from sqlalchemy import String, cast, func
from sqlalchemy.orm import load_only, selectinload
from sqlmodel import desc, select


def build_posts_query(
    *,
    post_type: Optional[PostType] = None,
    status: Optional[PostStatus] = None,
    category_id: Optional[UUID] = None,
    tag_id: Optional[UUID] = None,
    author_id: Optional[UUID] = None,
    is_featured: Optional[bool] = None,
    search_query: Optional[str] = None,
):
    """构建文章查询"""
    stmt = select(Post).options(
        load_only(
            Post.id,
            Post.slug,
            Post.title,
            Post.excerpt,
            Post.post_type,
            Post.status,
            Post.is_featured,
            Post.allow_comments,
            Post.reading_time,
            Post.view_count,
            Post.like_count,
            Post.bookmark_count,
            Post.created_at,
            Post.updated_at,
            Post.published_at,
            Post.author_id,
            Post.category_id,
            Post.cover_media_id,
            Post.meta_title,
            Post.meta_description,
            Post.meta_keywords,
            Post.git_hash,
            Post.source_path,
        ),
        selectinload(Post.category),
        selectinload(Post.author),
        selectinload(Post.tags),
        selectinload(Post.cover_media),
    )

    if post_type:
        stmt = stmt.where(Post.post_type == post_type)
    if status:
        stmt = stmt.where(Post.status == status)
    if author_id:
        stmt = stmt.where(Post.author_id == author_id)
    if is_featured is not None:
        stmt = stmt.where(Post.is_featured == is_featured)
    if category_id:
        stmt = stmt.where(Post.category_id == category_id)
    if tag_id:
        stmt = stmt.join(Post.tags).where(Tag.id == tag_id)
    if search_query:
        search_pattern = f"%{search_query}%"
        stmt = stmt.where(
            (Post.title.ilike(search_pattern)) | (Post.excerpt.ilike(search_pattern))
        )

    stmt = stmt.order_by(desc(Post.published_at), desc(Post.created_at))
    return stmt


def build_categories_query(
    post_type: PostType,
    is_active: Optional[bool] = True,
    is_featured: Optional[bool] = None,
):
    """构建分类查询

    Args:
        post_type: 内容类型
        is_active: 是否只显示启用的分类。None 表示显示所有。
        is_featured: 是否只显示推荐分类。None 表示显示所有。

    Returns:
        查询语句
    """
    from app.posts.model import Category

    stmt = (
        select(Category)
        # 将 Enum 类型显式转换为字符串后再进行 lower() 比较
        .where(func.lower(cast(Category.post_type, String)) == post_type.value.lower())
        .order_by(Category.sort_order.asc(), Category.name.asc())
        .options(
            selectinload(Category.parent),
            selectinload(Category.icon),
            selectinload(Category.cover_media),
        )
    )

    if is_active is not None:
        stmt = stmt.where(Category.is_active == is_active)

    if is_featured is not None:
        stmt = stmt.where(Category.is_featured == is_featured)

    return stmt


def build_tags_query(post_type: PostType):
    """构建标签查询

    Args:
        post_type: 内容类型

    Returns:
        查询语句
    """
    stmt = (
        select(Tag)
        .join(Tag.posts)
        .where(Post.post_type == post_type)
        .distinct()
        .order_by(Tag.name.asc())
    )
    return stmt
