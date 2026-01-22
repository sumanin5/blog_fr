"""
文章模块业务逻辑 (Service) 入口

兼容旧版本引用方式，但实际上逻辑已拆分到 services 包中。
建议后续直接引用 app.posts.services.*
"""

from app.posts.services import (
    create_category,
    create_post,
    delete_category,
    delete_orphaned_tags,
    delete_post,
    generate_unique_slug,
    get_post_detail,
    merge_tags,
    update_category,
    update_post,
    update_post_bookmark,
    update_post_like,
    update_tag,
)

__all__ = [
    "create_category",
    "create_post",
    "delete_category",
    "delete_orphaned_tags",
    "delete_post",
    "generate_unique_slug",
    "get_post_detail",
    "merge_tags",
    "update_category",
    "update_post",
    "update_post_bookmark",
    "update_post_like",
    "update_tag",
]
