"""
用户依赖项 - 异步版本

提供可复用的依赖项，如数据库会话、当前用户等
"""

from typing import Annotated

from app.core.db import get_async_session
from app.users import crud
from app.users.model import User
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

# ========================================
# OAuth2 密码模式（用于获取 token）
# ========================================
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")


# ========================================
# 依赖项
# ========================================


import jwt
import uuid
from app.core.config import settings
from app.core.security import ALGORITHM
from app.users.schema import TokenPayload

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
        HTTPException: 如果 token 无效或用户不存在
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # 解码 JWT token
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenPayload(sub=user_id)
    except jwt.PyJWTError:
        raise credentials_exception

    try:
        # 将 sub (str) 转换为 UUID
        # 注意：这里的 token_data.sub 是字符串格式的 UUID
        user_uuid = uuid.UUID(token_data.sub)
        user = await crud.get_user_by_id(session, user_uuid)
        if user is None:
            raise credentials_exception
        return user
    except (ValueError, AttributeError):
        # 如果 UUID 格式错误或转换失败
        raise credentials_exception


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
        HTTPException: 如果用户未激活
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )
    return current_user

async def get_current_adminuser(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> User:
    """
    获取当前超级用户

    Args:
        current_user: 当前用户

    Returns:
        当前用户对象

    Raises:
        HTTPException: 如果用户不是超级用户
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
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
        HTTPException: 如果用户不是超级用户
    """
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    return current_user
