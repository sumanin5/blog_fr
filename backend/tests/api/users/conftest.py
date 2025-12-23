"""
用户模块测试配置

只包含用户模块特有的测试数据，不重复通用配置
"""

import pytest
from app.core.security import get_password_hash
from app.users.model import User, UserRole
from sqlalchemy.ext.asyncio import AsyncSession

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


def assert_user_response(response_data: dict, expected_user: User = None):
    """断言用户响应格式"""
    required_fields = {
        "id",
        "username",
        "email",
        "role",
        "is_active",
        "created_at",
        "updated_at",
    }
    assert required_fields.issubset(set(response_data.keys()))
    assert "hashed_password" not in response_data

    if expected_user:
        assert response_data["username"] == expected_user.username
        assert response_data["email"] == expected_user.email
        assert response_data["role"] == expected_user.role.value
        assert response_data["is_active"] == expected_user.is_active


def assert_user_list_response(response_data: dict, expected_count: int = None):
    """断言用户列表响应格式"""
    assert "total" in response_data
    assert "users" in response_data
    assert isinstance(response_data["users"], list)

    if expected_count is not None:
        assert len(response_data["users"]) == expected_count

    for user in response_data["users"]:
        assert_user_response(user)


# ============================================================
# 用户模块测试数据类
# ============================================================


class UserTestData:
    """用户模块专用测试数据"""

    # 有效的注册数据
    VALID_REGISTER_DATA = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "password123",
        "full_name": "New User",
    }

    # 无效的注册数据
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

    # 有效的更新数据
    VALID_UPDATE_DATA = {"full_name": "Updated Name", "email": "updated@example.com"}

    # 部分更新数据
    PARTIAL_UPDATE_DATA = {
        "full_name_only": {"full_name": "Only Name Updated"},
        "email_only": {"email": "onlyemail@example.com"},
        "username_only": {"username": "newusername"},
    }

    # 无效的更新数据
    INVALID_UPDATE_DATA = {
        "invalid_email": {"email": "not-an-email"},
        "short_username": {"username": "ab"},
        "empty_fields": {"full_name": "", "email": ""},
    }

    # 登录数据
    VALID_LOGIN_DATA = {"username": "normal_user", "password": "password"}

    # 无效的登录数据
    INVALID_LOGIN_DATA = {
        "nonexistent_user": {"username": "nonexistent", "password": "password"},
        "wrong_password": {"username": "normal_user", "password": "wrongpassword"},
        "empty_username": {"username": "", "password": "password"},
        "empty_password": {"username": "normal_user", "password": ""},
    }


@pytest.fixture
def user_test_data():
    """用户模块专用测试数据"""
    return UserTestData()
