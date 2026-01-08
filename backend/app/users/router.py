"""
用户路由（API Endpoints）- 重构版本

定义所有用户相关的 API 接口，专注于HTTP层面的处理
"""

from typing import Annotated

from app.core.db import get_async_session
from app.users import dependencies, service
from app.users.dependencies import (
    get_current_active_user,
    get_current_superuser,
)
from app.users.model import User
from app.users.schema import (
    TokenResponse,
    UserListResponse,
    UserRegister,
    UserResponse,
    UserUpdate,
)
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel.ext.asyncio.session import AsyncSession

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
    return await service.register_user(session, user_in)


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
    return await service.authenticate_and_create_token(
        session, form_data.username, form_data.password
    )


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


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="更新当前用户信息",
    description="部分更新当前登录用户的信息",
)
async def update_current_user_info(
    user_in: UserUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """部分更新当前用户信息"""
    return await service.update_user_profile(
        session, current_user, user_in, current_user
    )


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
    await service.delete_user_account(session, current_user, current_user)
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
    current_user: Annotated[User, Depends(get_current_superuser)],
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
    users = await service.get_users_list(
        session, skip=skip, limit=limit, is_active=is_active, current_user=current_user
    )
    return UserListResponse(total=len(users), users=users)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="获取指定用户信息",
    description="根据 ID 获取用户信息（仅管理员）",
)
async def get_user_by_id(
    current_user: Annotated[User, Depends(get_current_superuser)],
    target_user: Annotated[User, Depends(dependencies.get_user_by_id_dep)],
):
    """获取指定用户信息（仅管理员）"""
    return target_user


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="更新指定用户信息",
    description="部分更新指定用户的信息（仅管理员）",
)
async def update_user_by_id(
    user_in: UserUpdate,
    current_user: Annotated[User, Depends(get_current_superuser)],
    target_user: Annotated[User, Depends(dependencies.get_user_by_id_dep)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """部分更新指定用户信息（仅管理员）"""
    return await service.update_user_profile(
        session, target_user, user_in, current_user
    )


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除指定用户",
    description="删除指定用户（仅管理员）",
)
async def delete_user_by_id(
    current_user: Annotated[User, Depends(get_current_superuser)],
    target_user: Annotated[User, Depends(dependencies.get_user_by_id_dep)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """删除指定用户（仅管理员）"""
    await service.delete_user_account(session, target_user, current_user)
    return None
