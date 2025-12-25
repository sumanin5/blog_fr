"""
用户依赖项 - 异步版本

提供可复用的依赖项，如数据库会话、当前用户等
"""

import logging
import uuid
from typing import Annotated

import jwt
from app.core.config import settings
from app.core.db import get_async_session
from app.core.exceptions import InsufficientPermissionsError
from app.core.security import ALGORITHM
from app.users import crud
from app.users.exceptions import InactiveUserError, InvalidCredentialsError
from app.users.model import User
from app.users.schema import TokenPayload
from fastapi import Depends, Path
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# ========================================
# OAuth2 密码模式（用于获取 token）
# ========================================
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/users/login")


# ========================================
# 依赖项
# ========================================


async def get_current_user(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    token: Annotated[str, Depends(oauth2_scheme)],
) -> User:
    """
    获取当前登录用户

    Args:
        session: 异步数据库会话
        token: JWT token

    Returns:
        当前用户对象

    Raises:
        InvalidCredentialsError: 如果 token 无效或用户不存在
    """

    try:
        # 解码 JWT token
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning(f"JWT token missing user ID: token={token[:20]}...")
            raise InvalidCredentialsError("Invalid token: missing user ID")
        token_data = TokenPayload(sub=user_id)
    except jwt.ExpiredSignatureError:
        logger.warning(f"JWT token expired: token={token[:20]}...")
        raise InvalidCredentialsError("Token has expired")
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: error={str(e)}, token={token[:20]}...")
        raise InvalidCredentialsError("Invalid token format")
    except Exception as e:
        logger.error(f"JWT decode error: {str(e)}")
        raise InvalidCredentialsError("Token validation failed")

    try:
        # 将 sub (str) 转换为 UUID
        user_uuid = uuid.UUID(token_data.sub)
        user = await crud.get_user_by_id(session, user_uuid)
        if user is None:
            logger.warning(f"User not found for valid JWT: user_id={user_uuid}")
            raise InvalidCredentialsError("User not found")

        logger.debug(
            f"JWT authentication successful: user_id={user.id}, username={user.username}"
        )
        return user
    except ValueError:
        logger.warning(f"Invalid UUID format in JWT: user_id={token_data.sub}")
        raise InvalidCredentialsError("Invalid user ID format")
    except Exception as e:
        logger.error(f"Database error during user lookup: {str(e)}")
        raise InvalidCredentialsError("Authentication failed")


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    获取当前激活的用户

    Args:
        current_user: 当前用户

    Returns:
        当前用户对象

    Raises:
        InactiveUserError: 如果用户未激活
    """
    if not current_user.is_active:
        logger.warning(
            f"Inactive user attempted access: user_id={current_user.id}, username={current_user.username}"
        )
        raise InactiveUserError(f"User account '{current_user.username}' is inactive")
    return current_user


async def get_current_adminuser(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    """
    获取当前管理员用户

    Args:
        current_user: 当前用户

    Returns:
        当前用户对象

    Raises:
        InsufficientPermissionsError: 如果用户不是管理员
    """
    if not current_user.is_admin:
        logger.warning(
            f"Non-admin user attempted admin access: user_id={current_user.id}, username={current_user.username}"
        )
        raise InsufficientPermissionsError("Admin privileges required")
    return current_user


async def get_current_superuser(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    """
    获取当前超级用户

    Args:
        current_user: 当前用户

    Returns:
        当前用户对象

    Raises:
        InsufficientPermissionsError: 如果用户不是超级用户
    """
    if not current_user.is_superadmin:  # 修复：应该检查 is_superadmin 而不是 is_admin
        logger.warning(
            f"Non-superuser attempted superuser access: user_id={current_user.id}, username={current_user.username}"
        )
        raise InsufficientPermissionsError("Superuser privileges required")
    return current_user


async def get_user_by_id_dep(
    user_id: Annotated[uuid.UUID, Path(description="用户ID")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> User:
    """
    根据 ID 获取用户（作为依赖项）

    Args:
        user_id: 路径参数中的用户ID
        session: 数据库会话

    Returns:
        用户对象

    Raises:
        UserNotFoundError: 如果用户不存在
    """
    user = await crud.get_user_by_id(session, user_id)
    if not user:
        from app.users.exceptions import UserNotFoundError

        logger.warning(f"User not found (dependency): user_id={user_id}")
        raise UserNotFoundError(f"User with ID {user_id} not found")

    return user
