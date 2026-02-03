"""
用户业务逻辑服务层

处理用户相关的业务逻辑，协调CRUD操作和业务规则
"""

import logging
from datetime import timedelta
from typing import Optional

from app.core.config import settings
from app.core.security import create_access_token
from app.users import crud
from app.users.exceptions import (
    InactiveUserError,
    InvalidCredentialsError,
    UserAlreadyExistsError,
    UserNotFoundError,
)
from app.users.model import User, UserRole
from app.users.schema import TokenResponse, UserCreate, UserRegister, UserUpdate
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


async def register_user(session: AsyncSession, user_data: UserRegister) -> User:
    """
    注册新用户

    Args:
        session: 数据库会话
        user_data: 用户注册数据

    Returns:
        创建的用户对象

    Raises:
        UserAlreadyExistsError: 用户名或邮箱已存在
    """
    logger.info(
        f"User registration attempt: username={user_data.username}, email={user_data.email}"
    )

    # 检查用户名是否已存在
    existing_user = await crud.get_user_by_username(session, user_data.username)
    if existing_user:
        logger.warning(
            f"Registration failed - username already exists: {user_data.username}"
        )
        raise UserAlreadyExistsError(f"Username '{user_data.username}' already exists")

    # 检查邮箱是否已存在
    existing_email = await crud.get_user_by_email(session, user_data.email)
    if existing_email:
        logger.warning(f"Registration failed - email already exists: {user_data.email}")
        raise UserAlreadyExistsError(f"Email '{user_data.email}' already exists")

    # 将 UserRegister 转换为 UserCreate，并强制指定角色为 USER
    user_create_data = user_data.model_dump()
    user_create = UserCreate(**user_create_data, role=UserRole.USER)

    # 创建用户
    user = await crud.create_user(session, user_create)
    logger.info(f"User registered successfully: username={user.username}, id={user.id}")

    return user


async def create_user_by_admin(
    session: AsyncSession, user_in: UserCreate, current_user: User
) -> User:
    """
    管理员创建用户（包含权限检查）

    Args:
        session: 数据库会话
        user_in: 用户创建数据
        current_user: 当前操作用户

    Returns:
        创建的用户对象

    Raises:
        InsufficientPermissionsError: 权限不足
        UserAlreadyExistsError: 用户名或邮箱已存在
    """
    from app.core.exceptions import InsufficientPermissionsError

    # 权限检查：只有超级管理员可以创建超级管理员
    if user_in.role == UserRole.SUPERADMIN and not current_user.is_superadmin:
        raise InsufficientPermissionsError(
            "Only superadmins can create superadmin accounts"
        )

    # 权限检查：管理员只能创建 Admin 或 User (逻辑上已隐含，因为非Admin进不来，但在业务层再次防御)
    if user_in.role == UserRole.ADMIN and not current_user.is_admin:
        raise InsufficientPermissionsError("Only admins can create admin accounts")

    logger.info(
        f"Admin creating user: creator={current_user.username}, new_user={user_in.username}, role={user_in.role}"
    )

    # 检查用户名是否已存在
    existing_user = await crud.get_user_by_username(session, user_in.username)
    if existing_user:
        raise UserAlreadyExistsError(f"Username '{user_in.username}' already exists")

    # 检查邮箱是否已存在
    existing_email = await crud.get_user_by_email(session, user_in.email)
    if existing_email:
        raise UserAlreadyExistsError(f"Email '{user_in.email}' already exists")

    # 创建用户
    user = await crud.create_user(session, user_in)
    return user


async def authenticate_and_create_token(
    session: AsyncSession, username: str, password: str
) -> TokenResponse:
    """
    用户认证并生成访问令牌

    Args:
        session: 数据库会话
        username: 用户名或邮箱
        password: 密码

    Returns:
        包含访问令牌的响应

    Raises:
        InvalidCredentialsError: 认证失败
    """
    logger.info(f"Login attempt: username={username}")

    # 1. 查找用户（用户名或邮箱）
    user = await crud.get_user_by_username(session, username)
    if not user:
        user = await crud.get_user_by_email(session, username)

    if not user:
        logger.warning(f"Login failed - user not found: username={username}")
        raise UserNotFoundError(f"User '{username}' is not registered")

    # 2. 验证密码
    if not crud.verify_password(password, user.hashed_password):
        logger.warning(f"Login failed - incorrect password: username={username}")
        raise InvalidCredentialsError("Incorrect password")

    # 检查用户是否激活
    if not user.is_active:
        logger.warning(f"Login attempt by inactive user: username={user.username}")
        raise InactiveUserError(f"User account '{user.username}' is inactive")

    # 生成访问令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )

    logger.info(f"Login successful: username={user.username}, id={user.id}")

    return TokenResponse(access_token=access_token, token_type="bearer")

    return TokenResponse(access_token=access_token, token_type="bearer")


async def update_user_profile(
    session: AsyncSession,
    user: User,
    update_data: UserUpdate,
    current_user: User,
) -> User:
    """
    更新用户资料

    Args:
        session: 数据库会话
        user: 要更新的用户对象 (Target User)
        update_data: 更新数据
        current_user: 当前操作用户 (Operator)

    Returns:
        更新后的用户对象

    Raises:
        UserAlreadyExistsError: 用户名或邮箱冲突
        UserNotFoundError: 更新失败
        InsufficientPermissionsError: 权限不足
    """
    from app.core.exceptions import InsufficientPermissionsError

    logger.info(
        f"User profile update attempt: user_id={user.id}, operator={current_user.username}"
    )

    # 🛡️ 权限栅栏 (Permission Guard)
    # 1. 只有超级管理员可以修改超级管理员账号
    if user.is_superadmin and not current_user.is_superadmin:
        # 允许超级管理员自己修改自己，或者其他超级管理员修改
        if user.id != current_user.id:
            raise InsufficientPermissionsError("Cannot modify a superadmin account")

    # 2. 如果尝试修改角色
    if update_data.role is not None:
        # 只有超级管理员可以将用户提升为超级管理员
        if update_data.role == UserRole.SUPERADMIN and not current_user.is_superadmin:
            raise InsufficientPermissionsError("Cannot promote user to superadmin")

    # 3. 普通管理员不能降级超级管理员 (已由规则1覆盖，但逻辑上保持清晰)

    # 检查更新数据中的冲突
    update_dict = update_data.model_dump(exclude_unset=True)

    # 检查用户名冲突
    if "username" in update_dict and update_dict["username"] != user.username:
        existing_user = await crud.get_user_by_username(
            session, update_dict["username"]
        )
        if existing_user and existing_user.id != user.id:
            logger.warning(
                f"Update failed - username conflict: {update_dict['username']}"
            )
            raise UserAlreadyExistsError(
                f"Username '{update_dict['username']}' already exists"
            )

    # 检查邮箱冲突
    if "email" in update_dict and update_dict["email"] != user.email:
        existing_email = await crud.get_user_by_email(session, update_dict["email"])
        if existing_email and existing_email.id != user.id:
            logger.warning(f"Update failed - email conflict: {update_dict['email']}")
            raise UserAlreadyExistsError(
                f"Email '{update_dict['email']}' already exists"
            )

    # 执行更新
    updated_user = await crud.update_user(session, user.id, update_data)
    if not updated_user:
        logger.error(f"Update operation failed: user_id={user.id}")
        raise UserNotFoundError(f"Failed to update user with ID {user.id}")

    logger.info(
        f"User profile updated successfully: user_id={user.id}, operator={current_user.username}"
    )

    return updated_user


async def delete_user_account(
    session: AsyncSession, user: User, current_user: User
) -> bool:
    """
    删除用户账号

    Args:
        session: 数据库会话
        user: 要删除的用户对象
        current_user: 当前操作用户

    Returns:
        是否删除成功

    Raises:
        UserNotFoundError: 删除失败
    """
    logger.warning(
        f"User account deletion attempt: user_id={user.id}, operator={current_user.username}"
    )

    from app.core.exceptions import InsufficientPermissionsError

    # 🛡️ 权限栅栏
    # 只有超级管理员可以删除超级管理员
    if user.is_superadmin and not current_user.is_superadmin:
        raise InsufficientPermissionsError("Cannot delete a superadmin account")

    # 执行删除
    success = await crud.delete_user(session, user.id)
    if not success:
        logger.error(f"Delete operation failed: user_id={user.id}")
        raise UserNotFoundError(f"Failed to delete user with ID {user.id}")

    logger.info(
        f"User account deleted successfully: user_id={user.id}, username={user.username}, operator={current_user.username}"
    )

    return success


async def get_users_list(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    current_user: User = None,
) -> list[User]:
    """
    获取用户列表（管理员功能）

    Args:
        session: 数据库会话
        skip: 跳过记录数
        limit: 限制记录数
        is_active: 是否只返回激活用户
        current_user: 当前操作用户

    Returns:
        用户列表
    """
    logger.info(
        f"Admin user list access: admin_user={current_user.username if current_user else 'unknown'}, skip={skip}, limit={limit}"
    )

    users = await crud.get_users(session, skip=skip, limit=limit, is_active=is_active)

    logger.info(
        f"User list retrieved: admin_user={current_user.username if current_user else 'unknown'}, total_users={len(users)}"
    )

    return users
