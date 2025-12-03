"""
用户数据库操作（CRUD）- 异步版本

包含所有与用户相关的数据库操作
"""

import uuid
from typing import Optional

from app.core.security import get_password_hash, verify_password
from app.users.model import User, UserRole
from app.users.schema import UserCreate, UserUpdate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# ========================================
# CRUD 操作（异步）
# ========================================


async def create_user(session: AsyncSession, user_in: UserCreate) -> User:
    """
    创建用户

    Args:
        session: 异步数据库会话
        user_in: 用户创建数据

    Returns:
        创建的用户对象
    """
    # 加密密码
    hashed_password = get_password_hash(user_in.password)

    # 创建用户对象
    user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_password,
        is_active=user_in.is_active,
        role=user_in.role,
        full_name=user_in.full_name or "",
        bio=user_in.bio or "",
        avatar=str(user_in.avatar) if user_in.avatar else "",
    )

    session.add(user)
    await session.commit()
    await session.refresh(user)

    return user


async def create_admin_user(session: AsyncSession, user_in: UserCreate) -> User:
    """
    创建管理员用户

    Args:
        session: 异步数据库会话
        user_in: 用户创建数据

    Returns:
        创建的管理员用户对象
    """
    user_in.role = UserRole.ADMIN
    return await create_user(session, user_in)


async def create_superadmin_user(session: AsyncSession, user_in: UserCreate) -> User:
    """
    创建超级管理员用户

    Args:
        session: 异步数据库会话
        user_in: 用户创建数据

    Returns:
        创建的超级管理员用户对象
    """
    user_in.role = UserRole.SUPERADMIN
    return await create_user(session, user_in)


async def get_user_by_id(session: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
    """
    根据 ID 获取用户

    Args:
        session: 异步数据库会话
        user_id: 用户 ID

    Returns:
        用户对象，如果不存在则返回 None
    """
    return await session.get(User, user_id)


async def get_user_by_username(session: AsyncSession, username: str) -> Optional[User]:
    """
    根据用户名获取用户

    Args:
        session: 异步数据库会话
        username: 用户名

    Returns:
        用户对象，如果不存在则返回 None
    """
    stmt = select(User).where(User.username == username)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_by_email(session: AsyncSession, email: str) -> Optional[User]:
    """
    根据邮箱获取用户

    Args:
        session: 异步数据库会话
        email: 邮箱

    Returns:
        用户对象，如果不存在则返回 None
    """
    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


# 理论上是应该使用分页逻辑，但是对于当前的小项目暂时不用考虑分页问题
async def get_user_by_roles(
    session: AsyncSession, role: UserRole
) -> Optional[list[User]]:
    """
    根据角色获取用户，获取所有的用户或者根据角色获取用户

    Args:
        session: 异步数据库会话
        role: 用户角色

    Returns:
        用户对象，如果不存在则返回 None
    """
    stmt = select(User).where(User.role == role)
    result = await session.execute(stmt)
    return result.scalars().all() or None


async def get_users(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
) -> list[User]:
    """
    获取用户列表

    Args:
        session: 异步数据库会话
        skip: 跳过的记录数
        limit: 返回的最大记录数
        is_active: 是否只返回激活的用户

    Returns:
        用户列表
    """
    stmt = select(User)

    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)

    stmt = stmt.order_by(User.id.desc()).offset(skip).limit(limit)

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def update_user(
    session: AsyncSession, user_id: uuid.UUID, user_in: UserUpdate
) -> Optional[User]:
    """
    更新用户

    Args:
        session: 异步数据库会话
        user_id: 用户 ID
        user_in: 用户更新数据

    Returns:
        更新后的用户对象，如果用户不存在则返回 None
    """
    user = await session.get(User, user_id)
    if not user:
        return None

    # 更新字段（只更新提供的字段）
    update_data = user_in.model_dump(exclude_unset=True)

    # 如果更新密码，需要加密
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(user, key, value)

    session.add(user)
    await session.commit()
    await session.refresh(user)

    return user


async def delete_user(session: AsyncSession, user_id: uuid.UUID) -> bool:
    """
    删除用户

    Args:
        session: 异步数据库会话
        user_id: 用户 ID

    Returns:
        是否删除成功
    """
    user = await session.get(User, user_id)
    if not user:
        return False

    await session.delete(user)
    await session.commit()

    return True


async def authenticate_user(
    session: AsyncSession, username: str, password: str
) -> Optional[User]:
    """
    验证用户（用于登录）

    Args:
        session: 异步数据库会话
        username: 用户名或邮箱
        password: 密码

    Returns:
        验证成功返回用户对象，否则返回 None
    """
    # 尝试用户名登录
    user = await get_user_by_username(session, username)

    # 如果用户名不存在，尝试邮箱登录
    if not user:
        user = await get_user_by_email(session, username)

    # 用户不存在或密码错误
    if not user or not verify_password(password, user.hashed_password):
        return None

    return user
