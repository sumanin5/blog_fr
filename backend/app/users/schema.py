"""
用户请求/响应模型（Pydantic Schemas）

用于 API 的请求验证和响应序列化
"""

import uuid
from datetime import datetime
from typing import Optional

from app.users.model import UserRole
from pydantic import BaseModel, EmailStr, Field, HttpUrl


# ========================================
# 基础模型（共享字段）
# ========================================
class UserBase(BaseModel):
    """用户基础模型（共享字段）"""

    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: EmailStr = Field(..., description="邮箱")
    is_active: bool = Field(True, description="是否激活")
    role: UserRole = Field(UserRole.USER, description="用户角色")
    full_name: Optional[str] = Field(None, max_length=100, description="全名")
    bio: Optional[str] = Field(None, max_length=500, description="用户简介")
    avatar: Optional[HttpUrl] = Field(None, description="用户头像 URL")


# ========================================
# 请求模型（用于接收客户端数据）
# ========================================
class UserRegister(BaseModel):
    """用户注册请求模型（仅限公开注册使用，不包含敏感字段）"""

    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: EmailStr = Field(..., description="邮箱")
    password: str = Field(..., min_length=6, max_length=100, description="密码")
    full_name: Optional[str] = Field(None, max_length=100, description="全名")
    bio: Optional[str] = Field(None, max_length=500, description="用户简介")
    avatar: Optional[HttpUrl] = Field(None, description="用户头像 URL")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "username": "alice",
                    "email": "alice@example.com",
                    "password": "secret123",
                    "full_name": "Alice Wonderland",
                }
            ]
        }
    }


class UserCreate(UserBase):
    """创建用户的请求模型（管理员使用，包含角色等字段）"""

    password: str = Field(..., min_length=4, max_length=100, description="密码")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "username": "admin_bob",
                    "email": "bob@example.com",
                    "password": "secret123",
                    "role": "admin",
                }
            ]
        }
    }


class UserUpdate(BaseModel):
    """更新用户的请求模型（所有字段可选）"""

    username: Optional[str] = Field(
        None, min_length=3, max_length=50, description="用户名"
    )
    email: Optional[EmailStr] = Field(None, description="邮箱")
    password: Optional[str] = Field(
        None, min_length=6, max_length=100, description="密码"
    )
    is_active: Optional[bool] = Field(None, description="是否激活")
    role: Optional[UserRole] = Field(None, description="用户角色")
    full_name: Optional[str] = Field(None, max_length=100, description="全名")
    bio: Optional[str] = Field(None, max_length=500, description="用户简介")
    avatar: Optional[HttpUrl] = Field(None, description="用户头像 URL")


class UserLogin(BaseModel):
    """用户登录的请求模型"""

    username: str = Field(..., description="用户名或邮箱")
    password: str = Field(..., description="密码")


# ========================================
# 响应模型（返回给客户端的数据）
# ========================================
class UserResponse(UserBase):
    """用户响应模型（不包含密码）"""

    id: uuid.UUID = Field(..., description="用户 ID")
    is_active: bool = Field(..., description="是否激活")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    last_login: Optional[datetime] = Field(None, description="最后登录时间")
    # 覆盖父类的 avatar 字段，允许空字符串
    avatar: Optional[str] = Field(None, description="用户头像 URL")

    model_config = {
        "from_attributes": True,  # 允许从 ORM 模型创建
        "json_schema_extra": {
            "examples": [
                {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "username": "alice",
                    "email": "alice@example.com",
                    "is_active": True,
                    "role": "user",
                    "created_at": "2025-12-02T10:00:00",
                    "updated_at": "2025-12-02T10:00:00",
                }
            ]
        },
    }


class UserListResponse(BaseModel):
    """用户列表响应模型"""

    total: int = Field(..., description="总数")
    users: list[UserResponse] = Field(..., description="用户列表")


class Token(BaseModel):
    """JWT Token 响应模型"""

    access_token: str = Field(..., description="访问令牌")
    token_type: str = Field(default="bearer", description="令牌类型")


class TokenPayload(BaseModel):
    """JWT 载荷模型"""

    sub: str | None = None


class TokenResponse(BaseModel):
    """JWT Token 响应模型"""

    access_token: str = Field(..., description="访问令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
