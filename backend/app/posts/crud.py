"""
文章模块数据库操作 (CRUD) 入口

兼容旧版本引用方式，但实际上逻辑已拆分到 cruds 包中。
建议后续直接引用 app.posts.cruds.*
"""

from app.posts.cruds import (
    create_category,
    decrement_bookmark_count,
    decrement_like_count,
    delete_category,
    delete_tag,
    get_category_by_id,
    get_category_by_slug,
    get_category_by_slug_and_type,
    get_or_create_tag,
    get_orphaned_tags,
    get_post_by_id,
    get_post_by_slug,
    get_posts_with_source_path,
    get_tag_by_id,
    get_tag_by_slug,
    increment_bookmark_count,
    increment_like_count,
    increment_view_count,
    list_tags_with_count,
    merge_tags,
    paginate_query,
    update_category,
    update_tag,
)

__all__ = [
    "create_category",
    "decrement_bookmark_count",
    "decrement_like_count",
    "delete_category",
    "delete_tag",
    "get_category_by_id",
    "get_category_by_slug",
    "get_category_by_slug_and_type",
    "get_or_create_tag",
    "get_orphaned_tags",
    "get_post_by_id",
    "get_post_by_slug",
    "get_posts_with_source_path",
    "get_tag_by_id",
    "get_tag_by_slug",
    "increment_bookmark_count",
    "increment_like_count",
    "increment_view_count",
    "list_tags_with_count",
    "merge_tags",
    "paginate_query",
    "update_category",
    "update_tag",
]
