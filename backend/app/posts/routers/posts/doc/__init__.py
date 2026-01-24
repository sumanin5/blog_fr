"""
文章路由文档导出
"""

# 编辑器文档
# 管理后台文档
from .admin_doc import (
    GET_MY_POSTS_DOC,
    LIST_ALL_POSTS_ADMIN_DOC,
    LIST_POSTS_BY_TYPE_ADMIN_DOC,
)
from .editor_doc import (
    CREATE_POST_BY_TYPE_DOC,
    DELETE_POST_BY_TYPE_DOC,
    PREVIEW_POST_DOC,
    UPDATE_POST_BY_TYPE_DOC,
)

# 互动文档
from .interactions_doc import (
    BOOKMARK_POST_DOC,
    LIKE_POST_DOC,
    UNBOOKMARK_POST_DOC,
    UNLIKE_POST_DOC,
)

# 公开文档
from .public_doc import (
    GET_POST_BY_ID_DOC,
    GET_POST_BY_SLUG_DOC,
    GET_POST_TYPES_DOC,
    LIST_POSTS_BY_TYPE_DOC,
)

__all__ = [
    # 编辑器
    "PREVIEW_POST_DOC",
    "CREATE_POST_BY_TYPE_DOC",
    "UPDATE_POST_BY_TYPE_DOC",
    "DELETE_POST_BY_TYPE_DOC",
    # 管理后台
    "LIST_POSTS_BY_TYPE_ADMIN_DOC",
    "LIST_ALL_POSTS_ADMIN_DOC",
    "GET_MY_POSTS_DOC",
    # 互动
    "LIKE_POST_DOC",
    "UNLIKE_POST_DOC",
    "BOOKMARK_POST_DOC",
    "UNBOOKMARK_POST_DOC",
    # 公开
    "GET_POST_TYPES_DOC",
    "LIST_POSTS_BY_TYPE_DOC",
    "GET_POST_BY_ID_DOC",
    "GET_POST_BY_SLUG_DOC",
]
