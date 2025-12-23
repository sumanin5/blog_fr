"""
用户资料管理测试模块

测试内容：
- ✅ 获取用户信息
- ✅ 更新用户资料
- ✅ 删除用户账号
"""

import pytest
from app.users.model import User
from httpx import AsyncClient
from tests.api.conftest import TestData, assert_error_response
from tests.api.users.conftest import assert_user_response

# ============================================================
# 获取用户信息测试
# ============================================================


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_get_current_user_info(
    async_client: AsyncClient,
    test_data: TestData,
    normal_user: User,
    normal_user_token_headers: dict,
):
    """测试获取当前用户信息"""
    response = await async_client.get("/users/me", headers=normal_user_token_headers)
    assert response.status_code == test_data.StatusCodes.OK

    data = response.json()
    assert_user_response(data, normal_user)


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_get_current_user_info_unauthorized(
    async_client: AsyncClient, test_data: TestData
):
    """测试未认证用户获取信息"""
    response = await async_client.get("/users/me")
    assert response.status_code == test_data.StatusCodes.UNAUTHORIZED


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_get_user_by_id_as_superadmin(
    async_client: AsyncClient,
    test_data: TestData,
    normal_user: User,
    superadmin_user_token_headers: dict,
):
    """测试超级管理员获取指定用户信息"""
    response = await async_client.get(
        f"/users/{normal_user.id}", headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK

    data = response.json()
    assert_user_response(data, normal_user)


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_get_user_by_id_as_normal_user(
    async_client: AsyncClient,
    test_data: TestData,
    admin_user: User,
    normal_user_token_headers: dict,
):
    """测试普通用户无法获取其他用户信息"""
    response = await async_client.get(
        f"/users/{admin_user.id}", headers=normal_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.FORBIDDEN

    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.INSUFFICIENT_PERMISSIONS)


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_get_nonexistent_user_by_id(
    async_client: AsyncClient, test_data: TestData, superadmin_user_token_headers: dict
):
    """测试获取不存在的用户"""
    fake_uuid = "019b0000-0000-7000-8000-000000000000"
    response = await async_client.get(
        f"/users/{fake_uuid}", headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.NOT_FOUND

    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.USER_NOT_FOUND)


# ============================================================
# 更新用户资料测试
# ============================================================


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_update_current_user_profile(
    async_client: AsyncClient,
    test_data: TestData,
    normal_user: User,
    normal_user_token_headers: dict,
):
    """测试更新当前用户资料"""
    update_data = test_data.VALID_UPDATE_DATA
    response = await async_client.patch(
        "/users/me", json=update_data, headers=normal_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK

    data = response.json()
    assert_user_response(data)
    assert data["full_name"] == update_data["full_name"]
    assert data["email"] == update_data["email"]
    assert data["username"] == normal_user.username  # 用户名未更新


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_update_current_user_partial(
    async_client: AsyncClient, test_data: TestData, normal_user_token_headers: dict
):
    """测试部分更新当前用户资料"""
    # 只更新全名
    update_data = test_data.PARTIAL_UPDATE_DATA["full_name_only"]
    response = await async_client.patch(
        "/users/me", json=update_data, headers=normal_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK

    data = response.json()
    assert_user_response(data)
    assert data["full_name"] == update_data["full_name"]


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_update_current_user_email_conflict(
    async_client: AsyncClient,
    test_data: TestData,
    admin_user: User,
    normal_user_token_headers: dict,
):
    """测试更新邮箱冲突"""
    # 尝试更新为已存在的邮箱
    update_data = {"email": admin_user.email}
    response = await async_client.patch(
        "/users/me", json=update_data, headers=normal_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.BAD_REQUEST

    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.USER_ALREADY_EXISTS)


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_update_current_user_username_conflict(
    async_client: AsyncClient,
    test_data: TestData,
    admin_user: User,
    normal_user_token_headers: dict,
):
    """测试更新用户名冲突"""
    # 尝试更新为已存在的用户名
    update_data = {"username": admin_user.username}
    response = await async_client.patch(
        "/users/me", json=update_data, headers=normal_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.BAD_REQUEST

    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.USER_ALREADY_EXISTS)


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_update_current_user_invalid_data(
    async_client: AsyncClient, test_data: TestData, normal_user_token_headers: dict
):
    """测试更新无效数据"""
    # 测试无效邮箱
    update_data = test_data.INVALID_UPDATE_DATA["invalid_email"]
    response = await async_client.patch(
        "/users/me", json=update_data, headers=normal_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.UNPROCESSABLE_ENTITY


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_update_user_by_id_as_superadmin(
    async_client: AsyncClient,
    test_data: TestData,
    normal_user: User,
    superadmin_user_token_headers: dict,
):
    """测试超级管理员更新指定用户"""
    update_data = {"full_name": "Updated by Admin"}
    response = await async_client.patch(
        f"/users/{normal_user.id}",
        json=update_data,
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == test_data.StatusCodes.OK

    data = response.json()
    assert_user_response(data)
    assert data["full_name"] == update_data["full_name"]


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_update_user_by_id_as_normal_user(
    async_client: AsyncClient,
    test_data: TestData,
    admin_user: User,
    normal_user_token_headers: dict,
):
    """测试普通用户无法更新其他用户"""
    update_data = {"full_name": "Unauthorized Update"}
    response = await async_client.patch(
        f"/users/{admin_user.id}",
        json=update_data,
        headers=normal_user_token_headers,
    )
    assert response.status_code == test_data.StatusCodes.FORBIDDEN

    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.INSUFFICIENT_PERMISSIONS)


# ============================================================
# 删除用户账号测试
# ============================================================


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_delete_current_user_account(
    async_client: AsyncClient, test_data: TestData, normal_user_token_headers: dict
):
    """测试删除当前用户账号"""
    response = await async_client.delete("/users/me", headers=normal_user_token_headers)
    assert response.status_code == test_data.StatusCodes.NO_CONTENT

    # 验证用户已被删除 - 尝试再次访问应该失败
    response = await async_client.get("/users/me", headers=normal_user_token_headers)
    assert response.status_code == test_data.StatusCodes.UNAUTHORIZED


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_delete_user_by_id_as_superadmin(
    async_client: AsyncClient,
    test_data: TestData,
    normal_user: User,
    superadmin_user_token_headers: dict,
):
    """测试超级管理员删除指定用户"""
    response = await async_client.delete(
        f"/users/{normal_user.id}", headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.NO_CONTENT

    # 验证用户已被删除
    response = await async_client.get(
        f"/users/{normal_user.id}", headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.NOT_FOUND


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_delete_user_by_id_as_normal_user(
    async_client: AsyncClient,
    test_data: TestData,
    admin_user: User,
    normal_user_token_headers: dict,
):
    """测试普通用户无法删除其他用户"""
    response = await async_client.delete(
        f"/users/{admin_user.id}", headers=normal_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.FORBIDDEN

    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.INSUFFICIENT_PERMISSIONS)


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.asyncio
async def test_delete_nonexistent_user(
    async_client: AsyncClient, test_data: TestData, superadmin_user_token_headers: dict
):
    """测试删除不存在的用户"""
    fake_uuid = "019b0000-0000-7000-8000-000000000000"
    response = await async_client.delete(
        f"/users/{fake_uuid}", headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.NOT_FOUND

    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.USER_NOT_FOUND)
