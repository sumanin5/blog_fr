"""
Posts API 文档模块

将路由文档按功能分类，便于维护和查找。
"""

from . import admin, editor, interactions, me, public

__all__ = ["public", "me", "editor", "admin", "interactions"]
