import pytest
from typing import AsyncGenerator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import get_password_hash
from app.users.model import User, UserRole

# ============================================================
# API 客户端 Fixtures
# ============================================================

from app.main import app
from app.core.db import get_async_session
from httpx import ASGITransport

@pytest.fixture(scope="function")
async def async_client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    创建异步 HTTP 客户端
    """
    # 使用 ASGITransport 直接调用 app，避免真实网络请求
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 覆盖 app 的 session 依赖，使用我们创建的 session
        app.dependency_overrides[get_async_session] = lambda: session
        yield client
        # 清理依赖覆盖
        app.dependency_overrides.clear()

# ============================================================
# 用户 Fixtures (自动创建不同权限的用户)
# ============================================================

@pytest.fixture(scope="function")
async def normal_user(session: AsyncSession) -> User:
    """
    创建一个普通用户
    用户名: normal_user
    密码: password
    """
    user = User(
        username="normal_user",
        email="normal@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.USER,
        is_active=True
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

@pytest.fixture(scope="function")
async def admin_user(session: AsyncSession) -> User:
    """
    创建一个管理员用户
    用户名: admin_user
    密码: password
    """
    user = User(
        username="admin_user",
        email="admin@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.ADMIN,
        is_active=True
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

@pytest.fixture(scope="function")
async def superadmin_user(session: AsyncSession) -> User:
    """
    创建一个超级管理员用户
    用户名: superadmin_user
    密码: password
    """
    user = User(
        username="superadmin_user",
        email="superadmin@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.SUPERADMIN,
        is_active=True
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

@pytest.fixture(scope="function")
async def normal_user_token_headers(async_client: AsyncClient, normal_user: User) -> dict:
    """
    获取普通用户的登录 Token Headers
    """
    response = await async_client.post(
        "/users/login",
        data={"username": "normal_user", "password": "password"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="function")
async def admin_user_token_headers(async_client: AsyncClient, admin_user: User) -> dict:
    """
    获取管理员用户的登录 Token Headers
    """
    response = await async_client.post(
        "/users/login",
        data={"username": "admin_user", "password": "password"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="function")
async def superadmin_user_token_headers(async_client: AsyncClient, superadmin_user: User) -> dict:
    """
    获取超级管理员用户的登录 Token Headers
    """
    response = await async_client.post(
        "/users/login",
        data={"username": "superadmin_user", "password": "password"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
