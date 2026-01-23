"""
Media API 文档模块

将路由文档按功能分类，便于维护和查找。
"""

from . import access, admin, management, public, stats, thumbnail, upload

__all__ = [
    "public",
    "upload",
    "management",
    "access",
    "thumbnail",
    "stats",
    "admin",
]
