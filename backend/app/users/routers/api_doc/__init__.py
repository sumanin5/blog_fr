"""
用户模块 API 文档

将文档按功能分类到不同的子模块：
- auth: 认证相关（注册、登录）
- profile: 个人中心（获取、更新、删除自己的信息）
- admin: 管理员功能（管理所有用户）

使用方式：
```python
from .api_doc import auth, profile, admin

@router.post("/register", description=auth.REGISTER_DOC)
@router.get("/me", description=profile.GET_ME_DOC)
@router.get("/", description=admin.LIST_USERS_DOC)
```
"""

from . import admin, auth, profile

__all__ = ["auth", "profile", "admin"]
