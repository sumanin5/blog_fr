"""
用户模块

包含用户相关的所有功能：
- 模型定义（model.py）
- 请求/响应模型（schema.py）
- 数据库操作（crud.py）
- API 路由（router.py）
"""

from app.users.router import router

__all__ = ["router"]
