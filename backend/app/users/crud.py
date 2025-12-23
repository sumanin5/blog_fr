"""
用户数据库操作（CRUD）- 异步版本

包含所有与用户相关的数据库操作
"""

import logging
import uuid
from typing import Optional

from app.core.security import get_password_hash, verify_password
from app.users.model import User, UserRole
from app.users.schema import UserCreate, UserUpdate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

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
    logger.info(f"Creating user: username={user_in.username}, email={user_in.email}")

    try:
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

        logger.info(
            f"User created successfully: id={user.id}, username={user.username}"
        )
        return user
    except Exception as e:
        logger.error(f"Failed to create user {user_in.username}: {str(e)}")
        await session.rollback()
        raise


async def create_admin_user(session: AsyncSession, user_in: UserCreate) -> User:
    """
    创建管理员用户

    Args:
        session: 异步数据库会话
        user_in: 用户创建数据

    Returns:
        创建的管理员用户对象
    """
    logger.info(f"Creating admin user: username={user_in.username}")
    user_in.role = UserRole.ADMIN
    user = await create_user(session, user_in)
    logger.info(f"Admin user created: id={user.id}, username={user.username}")
    return user


async def create_superadmin_user(session: AsyncSession, user_in: UserCreate) -> User:
    """
    创建超级管理员用户

    Args:
        session: 异步数据库会话
        user_in: 用户创建数据

    Returns:
        创建的超级管理员用户对象
    """
    logger.warning(
        f"Creating superadmin user: username={user_in.username}"
    )  # 用WARNING因为这是敏感操作
    user_in.role = UserRole.SUPERADMIN
    user = await create_user(session, user_in)
    logger.warning(f"Superadmin user created: id={user.id}, username={user.username}")
    return user


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
    logger.debug(f"Querying user by username: {username}")

    try:
        stmt = select(User).where(User.username == username)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()

        if user:
            logger.debug(f"User found by username: {username} -> {user.id}")
        else:
            logger.debug(f"User not found by username: {username}")

        return user
    except Exception as e:
        logger.error(f"Database error querying user by username {username}: {str(e)}")
        raise


async def get_user_by_email(session: AsyncSession, email: str) -> Optional[User]:
    """
    根据邮箱获取用户

    Args:
        session: 异步数据库会话
        email: 邮箱

    Returns:
        用户对象，如果不存在则返回 None
    """
    logger.debug(f"Querying user by email: {email}")

    try:
        stmt = select(User).where(User.email == email)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()

        if user:
            logger.debug(f"User found by email: {email} -> {user.id}")
        else:
            logger.debug(f"User not found by email: {email}")

        return user
    except Exception as e:
        logger.error(f"Database error querying user by email {email}: {str(e)}")
        raise


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
    logger.debug(f"Querying users by role: {role}")

    try:
        stmt = select(User).where(User.role == role)
        result = await session.execute(stmt)
        users = result.scalars().all() or None

        if users:
            logger.debug(f"Found {len(users)} users with role {role}")
        else:
            logger.debug(f"No users found with role {role}")

        return users
    except Exception as e:
        logger.error(f"Database error querying users by role {role}: {str(e)}")
        raise


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
    logger.debug(
        f"Querying users list: skip={skip}, limit={limit}, is_active={is_active}"
    )

    try:
        stmt = select(User)

        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)

        stmt = stmt.order_by(User.id.desc()).offset(skip).limit(limit)

        result = await session.execute(stmt)
        users = list(result.scalars().all())

        logger.info(f"Retrieved {len(users)} users from database")
        return users
    except Exception as e:
        logger.error(f"Database error querying users list: {str(e)}")
        raise


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
    logger.info(f"Updating user: user_id={user_id}")

    try:
        user = await session.get(User, user_id)
        if not user:
            logger.warning(f"User not found for update: user_id={user_id}")
            return None

        # 更新字段（只更新提供的字段）
        update_data = user_in.model_dump(exclude_unset=True)

        # 记录更新的字段
        updated_fields = list(update_data.keys())
        logger.debug(f"Updating fields for user {user_id}: {updated_fields}")

        # 如果更新密码，需要加密
        if "password" in update_data:
            update_data["hashed_password"] = get_password_hash(
                update_data.pop("password")
            )
            logger.info(f"Password updated for user: user_id={user_id}")

        for key, value in update_data.items():
            setattr(user, key, value)

        session.add(user)
        await session.commit()
        await session.refresh(user)

        logger.info(
            f"User updated successfully: user_id={user_id}, username={user.username}"
        )
        return user
    except Exception as e:
        logger.error(f"Failed to update user {user_id}: {str(e)}")
        await session.rollback()
        raise


async def delete_user(session: AsyncSession, user_id: uuid.UUID) -> bool:
    """
    删除用户

    Args:
        session: 异步数据库会话
        user_id: 用户 ID

    Returns:
        是否删除成功
    """
    logger.info(f"Deleting user: user_id={user_id}")

    try:
        user = await session.get(User, user_id)
        if not user:
            logger.warning(f"User not found for deletion: user_id={user_id}")
            return False

        username = user.username  # 保存用户名用于日志
        await session.delete(user)
        await session.commit()

        logger.info(
            f"User deleted successfully: user_id={user_id}, username={username}"
        )
        return True
    except Exception as e:
        logger.error(f"Failed to delete user {user_id}: {str(e)}")
        await session.rollback()
        raise


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
    logger.debug(f"Authenticating user: {username}")

    try:
        # 尝试用户名登录
        user = await get_user_by_username(session, username)

        # 如果用户名不存在，尝试邮箱登录
        if not user:
            user = await get_user_by_email(session, username)

        # 用户不存在
        if not user:
            logger.debug(f"User not found during authentication: {username}")
            return None

        # 密码错误
        if not verify_password(password, user.hashed_password):
            logger.warning(f"Password verification failed for user: {username}")
            return None

        logger.debug(f"User authenticated successfully: {user.username}")
        return user
    except Exception as e:
        logger.error(f"Authentication error for user {username}: {str(e)}")
        return None
