from fastapi import APIRouter

from .admin import user_admin_router

# 创建主路由
user_router = APIRouter()

# 注册子路由
user_router.include_router(user_admin_router)
