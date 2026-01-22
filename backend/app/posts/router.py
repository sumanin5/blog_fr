"""
文章模块路由入口

兼容旧版本引用方式，但实际上逻辑已拆分到 routers 包中。
建议后续直接引用 app.posts.routers.router
"""

from app.posts.routers import router

__all__ = ["router"]
