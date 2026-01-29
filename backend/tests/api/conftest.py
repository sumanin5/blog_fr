import os
from typing import AsyncGenerator, List

import pytest
from app.core.db import get_async_session
from app.core.security import get_password_hash
from app.main import app
from app.users.model import User, UserRole
from httpx import ASGITransport, AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

# ============================================================
# API URL 配置
# ============================================================


class APIConfig:
    """API 配置 - 统一管理所有 API 路径"""

    # 从环境变量读取 API 前缀
    API_PREFIX = os.getenv("API_PREFIX", "/api/v1")

    # 用户相关路由
    USERS_BASE = f"{API_PREFIX}/users"

    # 媒体相关路由
    MEDIA_BASE = f"{API_PREFIX}/media"

    # 分析相关路由
    ANALYTICS_BASE = f"{API_PREFIX}/analytics"

    @classmethod
    def user_url(cls, path: str = "") -> str:
        """生成用户相关的 URL"""
        return f"{cls.USERS_BASE}{path}"

    @classmethod
    def media_url(cls, path: str = "") -> str:
        """生成媒体相关的 URL"""
        return f"{cls.MEDIA_BASE}{path}"

    @classmethod
    def analytics_url(cls, path: str = "") -> str:
        """生成分析相关的 URL"""
        return f"{cls.ANALYTICS_BASE}{path}"


# ============================================================
# API 客户端 Fixtures
# ============================================================


@pytest.fixture(scope="function")
async def async_client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """创建异步 HTTP 客户端"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        app.dependency_overrides[get_async_session] = lambda: session
        yield client
        app.dependency_overrides.clear()


# 预计算密码哈希，避免每次重复计算
_CACHED_PASSWORD_HASH = None


def get_cached_password_hash():
    """获取缓存的密码哈希，避免重复计算"""
    global _CACHED_PASSWORD_HASH
    if _CACHED_PASSWORD_HASH is None:
        _CACHED_PASSWORD_HASH = get_password_hash("password")
    return _CACHED_PASSWORD_HASH


# ============================================================
# 用户 Fixtures (通用，供所有模块使用)
# ============================================================


@pytest.fixture(scope="function")
async def normal_user(session: AsyncSession) -> User:
    """创建普通用户"""
    user = User(
        username="normal_user",
        email="normal@example.com",
        hashed_password=get_cached_password_hash(),
        role=UserRole.USER,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.fixture(scope="function")
async def admin_user(session: AsyncSession) -> User:
    """创建管理员用户"""
    user = User(
        username="admin_user",
        email="admin@example.com",
        hashed_password=get_cached_password_hash(),
        role=UserRole.ADMIN,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.fixture(scope="function")
async def superadmin_user(session: AsyncSession) -> User:
    """创建超级管理员用户"""
    user = User(
        username="superadmin_user",
        email="superadmin@example.com",
        hashed_password=get_cached_password_hash(),
        role=UserRole.SUPERADMIN,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.fixture(scope="function")
async def inactive_user(session: AsyncSession) -> User:
    """创建非激活用户"""
    user = User(
        username="inactive_user",
        email="inactive@example.com",
        hashed_password=get_cached_password_hash(),
        role=UserRole.USER,
        is_active=False,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


# ============================================================
# Token Headers Fixtures (通用)
# ============================================================


@pytest.fixture(scope="function")
async def normal_user_token_headers(
    async_client: AsyncClient, normal_user: User
) -> dict:
    """获取普通用户的Token Headers"""
    response = await async_client.post(
        APIConfig.user_url("/login"),
        data={"username": "normal_user", "password": "password"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
async def admin_user_token_headers(async_client: AsyncClient, admin_user: User) -> dict:
    """获取管理员用户的Token Headers"""
    response = await async_client.post(
        APIConfig.user_url("/login"),
        data={"username": "admin_user", "password": "password"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
async def superadmin_user_token_headers(
    async_client: AsyncClient, superadmin_user: User
) -> dict:
    """获取超级管理员用户的Token Headers"""
    response = await async_client.post(
        APIConfig.user_url("/login"),
        data={"username": "superadmin_user", "password": "password"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ============================================================
# 批量数据 Fixtures (通用)
# ============================================================


@pytest.fixture(scope="function")
async def multiple_users(session: AsyncSession) -> List[User]:
    """创建多个用户用于列表测试"""
    users = []
    cached_hash = get_password_hash("password")  # 只计算一次
    for i in range(5):
        user = User(
            username=f"user_{i}",
            email=f"user{i}@example.com",
            hashed_password=cached_hash,
            role=UserRole.USER,
            is_active=i % 2 == 0,
            full_name=f"User {i}",
        )
        session.add(user)
        users.append(user)

    await session.commit()
    for user in users:
        await session.refresh(user)
    return users


@pytest.fixture(scope="function")
async def mixed_role_users(session: AsyncSession) -> List[User]:
    """创建不同角色的用户用于权限测试"""
    users = []
    cached_hash = get_password_hash("password")  # 只计算一次
    roles_data = [
        ("user_normal", "normal@test.com", UserRole.USER),
        ("user_admin", "admin@test.com", UserRole.ADMIN),
        ("user_super", "super@test.com", UserRole.SUPERADMIN),
    ]

    for username, email, role in roles_data:
        user = User(
            username=username,
            email=email,
            hashed_password=cached_hash,
            role=role,
            is_active=True,
            full_name=f"Test {role.value}",
        )
        session.add(user)
        users.append(user)

    await session.commit()
    for user in users:
        await session.refresh(user)
    return users


# ============================================================
# 测试工具函数
# ============================================================


def assert_error_response(response_data: dict, expected_code: str):
    """断言错误响应格式"""
    assert "error" in response_data
    error = response_data["error"]
    required_fields = {"code", "message", "details", "timestamp", "request_id"}
    assert set(error.keys()) == required_fields
    assert error["code"] == expected_code
    assert error["timestamp"].endswith("Z")
    assert error["request_id"]


def assert_token_response(response_data: dict):
    """断言Token响应格式"""
    required_fields = {"access_token", "token_type"}
    assert set(response_data.keys()) == required_fields
    assert response_data["token_type"] == "bearer"
    assert response_data["access_token"]


# ============================================================
# 测试数据类
# ============================================================


class TestData:
    """通用测试数据常量"""

    class StatusCodes:
        OK = 200
        CREATED = 201
        NO_CONTENT = 204
        BAD_REQUEST = 400
        UNAUTHORIZED = 401
        FORBIDDEN = 403
        NOT_FOUND = 404
        UNPROCESSABLE_ENTITY = 422
        INTERNAL_SERVER_ERROR = 500

    class ErrorCodes:
        USER_NOT_FOUND = "USER_NOT_FOUND"
        USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS"
        INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
        INACTIVE_USER = "INACTIVE_USER"
        INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
        VALIDATION_ERROR = "VALIDATION_ERROR"
        DATABASE_ERROR = "DATABASE_ERROR"
        INTERNAL_ERROR = "INTERNAL_ERROR"
        SLUG_CONFLICT = "SLUG_CONFLICT"  # 添加 slug 冲突错误码

    # 测试数据常量
    VALID_UPDATE_DATA = {
        "full_name": "Updated Name",
        "email": "updated@example.com",
    }

    PARTIAL_UPDATE_DATA = {
        "full_name_only": {"full_name": "Only Name Updated"},
        "email_only": {"email": "onlyemail@example.com"},
        "username_only": {"username": "newusername"},
    }

    INVALID_UPDATE_DATA = {
        "invalid_email": {"email": "not-an-email"},
        "short_username": {"username": "ab"},
        "empty_fields": {"full_name": "", "email": ""},
    }

    INVALID_REGISTER_DATA = {
        "short_username": {
            "username": "ab",
            "email": "valid@example.com",
            "password": "password123",
        },
        "invalid_email": {
            "username": "validuser",
            "email": "invalid-email",
            "password": "password123",
        },
        "short_password": {
            "username": "validuser",
            "email": "valid@example.com",
            "password": "123",
        },
        "missing_username": {
            "email": "valid@example.com",
            "password": "password123",
        },
        "missing_email": {
            "username": "validuser",
            "password": "password123",
        },
        "missing_password": {
            "username": "validuser",
            "email": "valid@example.com",
        },
    }

    INVALID_LOGIN_DATA = {
        "nonexistent_user": {"username": "nonexistent", "password": "password"},
        "wrong_password": {"username": "normal_user", "password": "wrongpassword"},
        "empty_username": {"username": "", "password": "password"},
        "empty_password": {"username": "normal_user", "password": ""},
    }


# ============================================================
# 测试数据 Fixture
# ============================================================


@pytest.fixture
def test_data():
    """通用测试数据常量"""
    return TestData()


@pytest.fixture
def api_urls():
    """提供 API URL 配置的 fixture"""
    return APIConfig
