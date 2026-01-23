"""
媒体文件路由模块

拆分为以下子模块：
- public: 公开接口
- upload: 上传接口
- me: 当前用户文件管理
- access: 文件访问（查看/下载）
- thumbnail: 缩略图管理
- stats: 统计接口
- admin: 管理员接口
"""

from fastapi import APIRouter

from . import access, admin, me, public, stats, thumbnail, upload

# 创建主路由
router = APIRouter()

# 注册子路由，合并为 4 个主要板块
# 1. 基础操作：公开查询 + 上传 (2个接口)
router.include_router(public.router, tags=["Media - Basic"])
router.include_router(upload.router, tags=["Media - Basic"])

# 2. 文件管理：用户文件CRUD (7个接口)
router.include_router(me.router, tags=["Media - Management"])

# 3. 文件访问：查看/下载/缩略图/统计 (5个接口)
router.include_router(access.router, tags=["Media - Access"])
router.include_router(thumbnail.router, tags=["Media - Access"])
router.include_router(stats.router, tags=["Media - Access"])

# 4. 管理员板块 (1个接口)
router.include_router(admin.router, tags=["Media - Admin"])

__all__ = ["router"]
