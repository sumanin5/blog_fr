"""
文章路由模块

包含文章相关的所有接口：
- public: 公开接口（4个）
- editor: 编辑接口（4个）
- admin: 管理接口（3个）
- interactions: 互动接口（4个）
"""

from fastapi import APIRouter

from . import admin, editor, interactions, public

# 创建文章子路由
router = APIRouter()

# 按特定顺序注册子路由，确保路径优先级正确
# 1. 静态路由优先（admin, me）
router.include_router(admin.router)

# 2. 功能性路由（editor - 包含 /preview）
router.include_router(editor.router)

# 3. 互动路由（/{post_type}/{post_id}/like, /bookmark）
router.include_router(interactions.router)

# 4. 动态路由（/{post_type}）- 必须放在最后
router.include_router(public.router)

__all__ = ["router"]
