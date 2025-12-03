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
    # TODO: 实现 JWT token 验证
    # 这里简化处理，实际项目需要验证 JWT token
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 示例：假设 token 就是 user_id
    try:
        user_id = int(token)
        user = await crud.get_user_by_id(session, user_id)
        if user is None:
            raise credentials_exception
        return user
    except ValueError:
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
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    return current_user
