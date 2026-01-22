from fastapi import APIRouter

from .admin import router as admin_router
from .editor import router as editor_router
from .interactions import router as interactions_router
from .me import router as me_router
from .public import router as public_router

# 创建主路由，前缀为 /posts
router = APIRouter(prefix="/posts")

# 按特定顺序注册子路由，确保路径优先级正确
# 1. 静态或特定前缀的路由 (admin, me)
router.include_router(admin_router)
router.include_router(me_router)

# 2. 功能性或动作路由 (editor - 若包含 /preview)
# 如果 editor 包含 dynamic methods (POST /types), 只要不和 static GET /types 冲突即可
router.include_router(editor_router)

# 3. 互动路由
router.include_router(interactions_router)

# 4. 动态路由 (/{post_type}) - 必须放在最后以捕获剩余请求
router.include_router(public_router)
