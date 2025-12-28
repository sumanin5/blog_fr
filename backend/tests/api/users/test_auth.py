"""
用户认证测试模块

测试内容：
- ✅ 用户注册功能
- ✅ 用户登录功能
- ✅ Token验证
"""

import pytest
from httpx import AsyncClient
from tests.api.conftest import (
    APIConfig,
    TestData,
    assert_error_response,
    assert_token_response,
)
from tests.api.users.conftest import UserTestData, assert_user_response

# ============================================================
# 用户注册测试
# ============================================================


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_register_user_success(
    async_client: AsyncClient,
    test_data: TestData,
    user_test_data: UserTestData,
    api_urls: APIConfig,
):
    """测试用户注册成功"""
    response = await async_client.post(
        api_urls.user_url("/register"),
        json=user_test_data.VALID_REGISTER_DATA,
    )
    assert response.status_code == test_data.StatusCodes.CREATED

    # 使用通用的断言工具函数
    data = response.json()
    assert_user_response(data)
    assert data["username"] == user_test_data.VALID_REGISTER_DATA["username"]
    assert data["email"] == user_test_data.VALID_REGISTER_DATA["email"]
    assert data["full_name"] == user_test_data.VALID_REGISTER_DATA["full_name"]
    assert data["role"] == "user"  # 默认角色
    assert data["is_active"] is True  # 默认激活


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_register_user_duplicate_username(
    async_client: AsyncClient, test_data: TestData, api_urls: APIConfig
):
    """测试注册重复用户名"""
    # 先注册一个用户
    await async_client.post(
        api_urls.user_url("/register"),
        json={
            "username": "duplicateuser",
            "email": "first@example.com",
            "password": "password123",
        },
    )

    # 尝试注册相同用户名的用户
    response = await async_client.post(
        api_urls.user_url("/register"),
        json={
            "username": "duplicateuser",
            "email": "second@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == test_data.StatusCodes.BAD_REQUEST

    # 使用新的错误响应断言
    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.USER_ALREADY_EXISTS)
    assert "duplicateuser" in data["error"]["message"]


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_register_user_duplicate_email(
    async_client: AsyncClient, test_data: TestData, api_urls: APIConfig
):
    """测试注册重复邮箱"""
    # 先注册一个用户
    await async_client.post(
        api_urls.user_url("/register"),
        json={
            "username": "user1",
            "email": "duplicate@example.com",
            "password": "password123",
        },
    )

    # 尝试注册相同邮箱的用户
    response = await async_client.post(
        api_urls.user_url("/register"),
        json={
            "username": "user2",
            "email": "duplicate@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == test_data.StatusCodes.BAD_REQUEST

    # 使用新的错误响应断言
    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.USER_ALREADY_EXISTS)
    assert "duplicate@example.com" in data["error"]["message"]


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_register_user_validation_errors(
    async_client: AsyncClient, test_data: TestData, api_urls: APIConfig
):
    """测试注册数据验证错误"""
    # 测试用户名太短
    response = await async_client.post(
        api_urls.user_url("/register"),
        json=test_data.INVALID_REGISTER_DATA["short_username"],
    )
    assert response.status_code == test_data.StatusCodes.UNPROCESSABLE_ENTITY
    data = response.json()

    # 现在使用统一的错误响应格式
    assert "error" in data
    error = data["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["message"] == "Request validation failed"
    assert "validation_errors" in error["details"]

    # 验证错误详情
    validation_errors = error["details"]["validation_errors"]
    assert len(validation_errors) > 0
    assert any("username" in err["field"] for err in validation_errors)


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_register_user_missing_required_fields(
    async_client: AsyncClient, test_data: TestData, api_urls: APIConfig
):
    """测试注册缺少必需字段"""
    # 测试缺少用户名
    response = await async_client.post(
        api_urls.user_url("/register"),
        json=test_data.INVALID_REGISTER_DATA["missing_username"],
    )
    assert response.status_code == test_data.StatusCodes.UNPROCESSABLE_ENTITY

    # 测试缺少邮箱
    response = await async_client.post(
        api_urls.user_url("/register"),
        json=test_data.INVALID_REGISTER_DATA["missing_email"],
    )
    assert response.status_code == test_data.StatusCodes.UNPROCESSABLE_ENTITY

    # 测试缺少密码
    response = await async_client.post(
        api_urls.user_url("/register"),
        json=test_data.INVALID_REGISTER_DATA["missing_password"],
    )
    assert response.status_code == test_data.StatusCodes.UNPROCESSABLE_ENTITY


# ============================================================
# 用户登录测试
# ============================================================


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_login_success(
    async_client: AsyncClient, test_data: TestData, api_urls: APIConfig
):
    """测试用户登录成功"""
    # 先注册
    await async_client.post(
        api_urls.user_url("/register"),
        json={
            "username": "loginuser",
            "email": "login@example.com",
            "password": "password123",
        },
    )

    # 登录
    response = await async_client.post(
        api_urls.user_url("/login"),
        data={
            "username": "loginuser",
            "password": "password123",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == test_data.StatusCodes.OK

    # 使用新的token响应断言
    data = response.json()
    assert_token_response(data)


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_login_with_email(
    async_client: AsyncClient, test_data: TestData, api_urls: APIConfig
):
    """测试使用邮箱登录"""
    # 先注册
    await async_client.post(
        api_urls.user_url("/register"),
        json={
            "username": "emailuser",
            "email": "email@example.com",
            "password": "password123",
        },
    )

    # 使用邮箱登录
    response = await async_client.post(
        api_urls.user_url("/login"),
        data={
            "username": "email@example.com",  # 使用邮箱作为用户名
            "password": "password123",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == test_data.StatusCodes.OK

    data = response.json()
    assert_token_response(data)


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_login_wrong_password(
    async_client: AsyncClient, test_data: TestData, api_urls: APIConfig
):
    """测试错误密码登录"""
    # 先注册
    await async_client.post(
        api_urls.user_url("/register"),
        json={
            "username": "wrongpassuser",
            "email": "wrongpass@example.com",
            "password": "password123",
        },
    )

    # 尝试用错误密码登录
    response = await async_client.post(
        api_urls.user_url("/login"),
        data={
            "username": "wrongpassuser",
            "password": "wrongpassword",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == test_data.StatusCodes.UNAUTHORIZED

    # 使用新的错误响应断言
    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.INVALID_CREDENTIALS)


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_login_nonexistent_user(
    async_client: AsyncClient, test_data: TestData, api_urls: APIConfig
):
    """测试不存在的用户登录"""
    response = await async_client.post(
        api_urls.user_url("/login"),
        data=test_data.INVALID_LOGIN_DATA["nonexistent_user"],
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == test_data.StatusCodes.UNAUTHORIZED

    # 使用新的错误响应断言
    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.INVALID_CREDENTIALS)


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_login_inactive_user(
    async_client: AsyncClient, test_data: TestData, api_urls: APIConfig, inactive_user
):
    """测试非激活用户登录"""
    response = await async_client.post(
        api_urls.user_url("/login"),
        data={
            "username": "inactive_user",
            "password": "password",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == test_data.StatusCodes.BAD_REQUEST

    # 使用新的错误响应断言
    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.INACTIVE_USER)


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_login_empty_credentials(
    async_client: AsyncClient, test_data: TestData, api_urls: APIConfig
):
    """测试空凭据登录"""
    # 测试空用户名 - 被当作无效凭据处理
    response = await async_client.post(
        api_urls.user_url("/login"),
        data=test_data.INVALID_LOGIN_DATA["empty_username"],
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == test_data.StatusCodes.UNAUTHORIZED
    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.INVALID_CREDENTIALS)

    # 测试空密码 - 也被当作无效凭据处理
    response = await async_client.post(
        api_urls.user_url("/login"),
        data=test_data.INVALID_LOGIN_DATA["empty_password"],
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == test_data.StatusCodes.UNAUTHORIZED
    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.INVALID_CREDENTIALS)


# ============================================================
# Token验证测试
# ============================================================


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_token_format_validation(
    async_client: AsyncClient, test_data: TestData, api_urls: APIConfig
):
    """测试Token格式验证"""
    # 先注册并登录获取有效token
    await async_client.post(
        api_urls.user_url("/register"),
        json={
            "username": "tokenuser",
            "email": "token@example.com",
            "password": "password123",
        },
    )

    login_response = await async_client.post(
        api_urls.user_url("/login"),
        data={
            "username": "tokenuser",
            "password": "password123",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    token_data = login_response.json()
    assert_token_response(token_data)

    # 验证token可以用于访问受保护的端点
    response = await async_client.get(
        api_urls.user_url("/me"),
        headers={"Authorization": f"Bearer {token_data['access_token']}"},
    )
    assert response.status_code == test_data.StatusCodes.OK

    user_data = response.json()
    assert_user_response(user_data)
    assert user_data["username"] == "tokenuser"


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_invalid_token_access(
    async_client: AsyncClient, test_data: TestData, api_urls: APIConfig
):
    """测试无效token访问"""
    # 测试无token
    response = await async_client.get(api_urls.user_url("/me"))
    assert response.status_code == test_data.StatusCodes.UNAUTHORIZED

    # 测试无效token
    response = await async_client.get(
        api_urls.user_url("/me"), headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == test_data.StatusCodes.UNAUTHORIZED

    # 测试错误的Authorization格式
    response = await async_client.get(
        api_urls.user_url("/me"), headers={"Authorization": "invalid_format"}
    )
    assert response.status_code == test_data.StatusCodes.UNAUTHORIZED
