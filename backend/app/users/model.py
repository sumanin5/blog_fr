"""
用户数据库模型

定义数据库表结构
"""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from app.core.base import Base
from sqlmodel import Field, Relationship

if TYPE_CHECKING:
    from app.media.model import MediaFile


# 定义用户角色枚举
# 继承 str 使其可以直接序列化为 JSON 字符串
# 相当于 Django 的 models.TextChoices
class UserRole(str, Enum):
    USER = "user"  # 普通用户
    ADMIN = "admin"  # 管理员
    SUPERADMIN = "superadmin"  # 超级管理员


class User(Base, table=True):
    """
    用户表

    字段说明:
        - id: 主键，自增
        - username: 用户名，唯一
        - email: 邮箱，唯一
        - hashed_password: 加密后的密码
        - is_active: 是否激活
        - role: 用户角色(默认user, 可选admin, superadmin)
        - created_at: 创建时间（继承自 BaseModel）
        - updated_at: 更新时间（继承自 BaseModel）
    """

    __tablename__ = "users"

    username: str = Field(
        unique=True, index=True, min_length=3, max_length=50, description="用户名"
    )
    email: str = Field(unique=True, index=True, description="邮箱")
    hashed_password: str = Field(description="加密后的密码")
    is_active: bool = Field(default=True, description="是否激活")
    role: UserRole = Field(default=UserRole.USER, description="用户角色")
    full_name: str = Field(default="", max_length=100, description="用户全名/昵称")
    bio: str = Field(default="", description="用户简介")
    avatar: str = Field(default="", description="用户头像")
    last_login: Optional[datetime] = Field(default=None, description="最后登录时间")

    # 关系字段
    media_files: list["MediaFile"] = Relationship(back_populates="uploader")

    @property
    def is_admin(self) -> bool:
        """是否是管理员 (包含 admin 和 superadmin)"""
        return self.role in (UserRole.ADMIN, UserRole.SUPERADMIN)

    @property
    def is_superadmin(self) -> bool:
        """是否是超级管理员"""
        return self.role == UserRole.SUPERADMIN

    def __repr__(self) -> str:
        return f"User(id={self.id!r}, username={self.username!r}, email={self.email!r})"

    __str__ = __repr__
