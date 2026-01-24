"""
文章路由模块

按资源类型组织：
- posts: 文章相关接口（13个）
- categories: 分类管理接口（4个）
- tags: 标签管理接口（5个）
"""

from fastapi import APIRouter

from . import categories, posts, tags

# 创建主路由，前缀为 /posts
router = APIRouter(prefix="/posts")

# 注册子路由
# 1. 标签管理（必须在 posts 之前，以便 /admin/tags 优先于 /{post_type}/tags）
router.include_router(tags.router)

# 2. 分类管理
router.include_router(categories.router)

# 3. 文章板块（包含 public, editor, admin, interactions）
router.include_router(posts.router)

__all__ = ["router"]
