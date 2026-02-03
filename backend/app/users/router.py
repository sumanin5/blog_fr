"""
用户路由（API Endpoints）

定义所有用户相关的 API 接口，专注于HTTP层面的处理。
文档已分类到 api_doc 子模块中。
"""

from typing import Annotated

from app.core.db import get_async_session
from app.users import service
from app.users.api_doc import admin, auth, profile
from app.users.dependencies import (
    get_current_active_user,
    get_current_adminuser,
    get_user_by_id_dep,
)
from app.users.model import User
from app.users.schema import (
    TokenResponse,
    UserCreate,
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
    description=auth.REGISTER_DOC,
)
async def register_user(
    user_in: UserRegister, session: Annotated[AsyncSession, Depends(get_async_session)]
):
    return await service.register_user(session, user_in)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="用户登录",
    description=auth.LOGIN_DOC,
)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
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
    description=profile.GET_ME_DOC,
)
async def get_current_user_info(
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    return current_user


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="更新当前用户信息",
    description=profile.UPDATE_ME_DOC,
)
async def update_current_user_info(
    user_in: UserUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    return await service.update_user_profile(
        session, current_user, user_in, current_user
    )


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除当前用户账号",
    description=profile.DELETE_ME_DOC,
)
async def delete_current_user_account(
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    await service.delete_user_account(session, current_user, current_user)
    return None


# ========================================
# 管理员接口（管理员及以上权限）
# ========================================


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建新用户（管理员）",
    description=admin.CREATE_USER_DOC
    if hasattr(admin, "CREATE_USER_DOC")
    else "管理员创建新用户",
)
async def create_new_user(
    user_in: UserCreate,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(get_current_adminuser)],
):
    return await service.create_user_by_admin(session, user_in, current_user)


@router.get(
    "/",
    response_model=UserListResponse,
    summary="获取用户列表（管理员）",
    description=admin.LIST_USERS_DOC,
)
async def get_users_list(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(get_current_adminuser)],
    skip: int = 0,
    limit: int = 100,
    is_active: bool | None = None,
):
    users = await service.get_users_list(
        session, skip=skip, limit=limit, is_active=is_active, current_user=current_user
    )
    return UserListResponse(total=len(users), users=users)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="获取指定用户信息（管理员）",
    description=admin.GET_USER_DOC,
)
async def get_user_by_id(
    current_user: Annotated[User, Depends(get_current_adminuser)],
    target_user: Annotated[User, Depends(get_user_by_id_dep)],
):
    return target_user


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="更新指定用户信息（管理员）",
    description=admin.UPDATE_USER_DOC,
)
async def update_user_by_id(
    user_in: UserUpdate,
    current_user: Annotated[User, Depends(get_current_adminuser)],
    target_user: Annotated[User, Depends(get_user_by_id_dep)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    return await service.update_user_profile(
        session, target_user, user_in, current_user
    )


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除指定用户（管理员）",
    description=admin.DELETE_USER_DOC,
)
async def delete_user_by_id(
    current_user: Annotated[User, Depends(get_current_adminuser)],
    target_user: Annotated[User, Depends(get_user_by_id_dep)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    await service.delete_user_account(session, target_user, current_user)
    return None
