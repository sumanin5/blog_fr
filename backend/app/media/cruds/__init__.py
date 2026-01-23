"""
CRUD 操作模块

拆分为以下子模块：
- basic: 基础 CRUD 操作（增删改查）
- query: 复杂查询操作
- stats: 统计操作
"""

from . import basic, query, stats

# 重新导出所有函数（向后兼容）
from .basic import (
    create_media_file,
    delete_media_file,
    get_media_file,
    get_media_file_by_hash,
    get_media_file_by_path,
    get_media_files_by_ids,
    update_download_count,
    update_media_file,
    update_view_count,
)
from .query import (
    get_all_media_files,
    get_media_files_by_criteria,
    get_media_files_by_tags,
    get_media_files_by_usage,
    get_orphaned_files,
    get_popular_files,
    get_public_media_files,
    get_recent_files,
    get_user_media_files,
    get_user_public_files,
    paginate_query,
    search_media_files,
)
from .stats import (
    get_media_stats_by_type,
    get_media_stats_by_usage,
    get_total_storage_size,
    get_user_media_count,
    get_user_media_stats,
    get_user_storage_usage,
)

__all__ = [
    # 子模块
    "basic",
    "query",
    "stats",
    # basic 函数
    "create_media_file",
    "get_media_file",
    "get_media_file_by_hash",
    "get_media_file_by_path",
    "get_media_files_by_ids",
    "update_media_file",
    "delete_media_file",
    "update_view_count",
    "update_download_count",
    # query 函数
    "paginate_query",
    "get_public_media_files",
    "get_user_public_files",
    "get_user_media_files",
    "get_media_files_by_usage",
    "get_media_files_by_tags",
    "search_media_files",
    "get_all_media_files",
    "get_recent_files",
    "get_popular_files",
    "get_orphaned_files",
    "get_media_files_by_criteria",
    # stats 函数
    "get_user_media_stats",
    "get_user_media_count",
    "get_user_storage_usage",
    "get_total_storage_size",
    "get_media_stats_by_type",
    "get_media_stats_by_usage",
]
