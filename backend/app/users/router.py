"""
用户路由（API Endpoints）- 异步版本

定义所有用户相关的 API 接口
"""

import uuid
from datetime import timedelta
from typing import Annotated

from app.core.config import settings
from app.core.db import get_async_session
from app.core.security import create_access_token
from app.users import crud
from app.users.dependencies import (
    get_current_active_user,
    get_current_superuser,
)
from app.users.model import User, UserRole
from app.users.schema import (
    TokenResponse,
    UserCreate,
    UserListResponse,
    UserRegister,
    UserResponse,
    UserUpdate,
)
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

# ========================================
# 创建路由
# ========================================
router = APIRouter()


# ========================================
# 公开接口（不需要登录）
# ========================================


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="注册新用户",
    description="创建一个新用户账号（默认普通用户权限）",
)
async def register_user(
    user_in: UserRegister, session: Annotated[AsyncSession, Depends(get_async_session)]
):
    """
    注册新用户

    - **username**: 用户名（3-50 字符，唯一）
    - **email**: 邮箱（唯一）
    - **password**: 密码（至少 6 个字符）
    - **full_name**: 全名（可选）
    """
    # 检查用户名是否已存在
    if await crud.get_user_by_username(session, user_in.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    # 检查邮箱是否已存在
    if await crud.get_user_by_email(session, user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # 将 UserRegister 转换为 UserCreate，并强制指定角色为 USER
    # 这样可以复用 crud.create_user 逻辑，同时确保安全性
    user_create_data = user_in.model_dump()
    user_create = UserCreate(**user_create_data, role=UserRole.USER)

    # 创建用户
    user = await crud.create_user(session, user_create)
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="用户登录",
    description="使用用户名/邮箱和密码登录",
)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    用户登录

    - **username**: 用户名或邮箱
    - **password**: 密码

    Returns:
        JWT token
    """
    user = await crud.authenticate_user(session, form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 生成真正的 JWT token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


# ========================================
# 需要登录的接口
# ========================================


@router.get(
    "/me",
    response_model=UserResponse,
    summary="获取当前用户信息",
    description="获取当前登录用户的详细信息",
)
async def get_current_user_info(
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """获取当前用户信息"""
    return current_user


@router.put(
    "/me",
    response_model=UserResponse,
    summary="更新当前用户信息",
    description="更新当前登录用户的信息",
)
async def update_current_user_info(
    user_in: UserUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """更新当前用户信息"""
    user = await crud.update_user(session, current_user.id, user_in)
    return user


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除当前用户",
    description="删除当前登录用户的账号",
)
async def delete_current_user_account(
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """删除当前用户账号"""
    await crud.delete_user(session, current_user.id)
    return None


# ========================================
# 管理员接口（需要超级用户权限）
# ========================================


@router.get(
    "/",
    response_model=UserListResponse,
    summary="获取用户列表",
    description="获取所有用户列表（仅管理员）",
)
async def get_users_list(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    _: Annotated[User, Depends(get_current_superuser)],  # 需要超级用户权限
    skip: int = 0,
    limit: int = 100,
    is_active: bool | None = None,
):
    """
    获取用户列表（仅管理员）

    - **skip**: 跳过的记录数
    - **limit**: 返回的最大记录数
    - **is_active**: 是否只返回激活的用户
    """
    users = await crud.get_users(session, skip=skip, limit=limit, is_active=is_active)
    total = len(users)  # 简化处理，实际应该查询总数

    return UserListResponse(total=total, users=users)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="获取指定用户信息",
    description="根据 ID 获取用户信息（仅管理员）",
)
async def get_user_by_id(
    user_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    _: Annotated[User, Depends(get_current_superuser)],
):
    """获取指定用户信息（仅管理员）"""
    user = await crud.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="更新指定用户信息",
    description="更新指定用户的信息（仅管理员）",
)
async def update_user_by_id(
    user_id: uuid.UUID,
    user_in: UserUpdate,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    _: Annotated[User, Depends(get_current_superuser)],
):
    """更新指定用户信息（仅管理员）"""
    user = await crud.update_user(session, user_id, user_in)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除指定用户",
    description="删除指定用户（仅管理员）",
)
async def delete_user_by_id(
    user_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    _: Annotated[User, Depends(get_current_superuser)],
):
    """删除指定用户（仅管理员）"""
    success = await crud.delete_user(session, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return None
