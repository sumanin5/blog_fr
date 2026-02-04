"""
用户权限管理测试模块

测试内容：
- ✅ 角色权限验证
- ✅ 用户列表访问权限
- ✅ 跨用户操作权限
"""

import pytest
from app.users.model import User
from httpx import AsyncClient
from tests.api.conftest import APIConfig, TestData, assert_error_response
from tests.api.users.conftest import assert_user_list_response, assert_user_response

# ============================================================
# 角色权限验证测试
# ============================================================


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.permissions
@pytest.mark.asyncio
async def test_normal_user_permissions(
    async_client: AsyncClient,
    test_data: TestData,
    normal_user: User,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试普通用户权限范围"""
    # ✅ 可以获取自己的信息
    response = await async_client.get(
        api_urls.user_url("/me"), headers=normal_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK
    data = response.json()
    assert_user_response(data, normal_user)

    # ✅ 可以更新自己的资料
    response = await async_client.patch(
        api_urls.user_url("/me"),
        json={"full_name": "Updated Name"},
        headers=normal_user_token_headers,
    )
    assert response.status_code == test_data.StatusCodes.OK

    # ❌ 不能获取用户列表
    response = await async_client.get(
        api_urls.user_url("/"), headers=normal_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.FORBIDDEN
    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.INSUFFICIENT_PERMISSIONS)


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.permissions
@pytest.mark.asyncio
async def test_admin_user_permissions(
    async_client: AsyncClient,
    test_data: TestData,
    admin_user: User,
    admin_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试管理员用户权限范围"""
    # ✅ 可以获取自己的信息
    response = await async_client.get(
        api_urls.user_url("/me"), headers=admin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK
    data = response.json()
    assert_user_response(data, admin_user)

    # ✅ 管理员现在可以获取用户列表（权限放宽）
    response = await async_client.get(
        api_urls.user_url("/"), headers=admin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK
    data = response.json()
    assert_user_list_response(data)


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.permissions
@pytest.mark.asyncio
async def test_superadmin_user_permissions(
    async_client: AsyncClient,
    test_data: TestData,
    superadmin_user: User,
    superadmin_user_token_headers: dict,
    api_urls: APIConfig,
    multiple_users,
):
    """测试超级管理员用户权限范围"""
    # ✅ 可以获取自己的信息
    response = await async_client.get(
        api_urls.user_url("/me"), headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK
    data = response.json()
    assert_user_response(data, superadmin_user)

    # ✅ 可以获取用户列表
    response = await async_client.get(
        api_urls.user_url("/"), headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK
    data = response.json()
    assert_user_list_response(data)

    # multiple_users创建了5个用户，加上superadmin_user，总共6个
    assert len(data["users"]) == 6

    # ✅ 可以获取其他用户信息
    target_user = multiple_users[0]
    response = await async_client.get(
        api_urls.user_url(f"/{target_user.id}"), headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK

    # ✅ 可以更新其他用户信息
    response = await async_client.patch(
        api_urls.user_url(f"/{target_user.id}"),
        json={"full_name": "Updated by Admin"},
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == test_data.StatusCodes.OK

    # ✅ 可以删除其他用户
    response = await async_client.delete(
        api_urls.user_url(f"/{target_user.id}"), headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.NO_CONTENT


# ============================================================
# 用户列表访问权限测试
# ============================================================


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.permissions
@pytest.mark.asyncio
async def test_user_list_access_permissions(
    async_client: AsyncClient,
    test_data: TestData,
    normal_user_token_headers: dict,
    admin_user_token_headers: dict,
    superadmin_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试用户列表访问权限"""
    # 普通用户不能访问
    response = await async_client.get(
        api_urls.user_url("/"), headers=normal_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.FORBIDDEN

    # 管理员可以访问（权限放宽）
    response = await async_client.get(
        api_urls.user_url("/"), headers=admin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK

    # 只有超级管理员可以访问
    response = await async_client.get(
        api_urls.user_url("/"), headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.permissions
@pytest.mark.asyncio
async def test_user_list_pagination(
    async_client: AsyncClient,
    test_data: TestData,
    superadmin_user_token_headers: dict,
    multiple_users,
    api_urls: APIConfig,
):
    """测试用户列表分页功能"""
    # 测试分页参数
    response = await async_client.get(
        api_urls.user_url("/?skip=0&limit=3"), headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK
    data = response.json()
    assert_user_list_response(data)
    assert len(data["users"]) == 3

    # 测试第二页
    response = await async_client.get(
        api_urls.user_url("/?skip=3&limit=3"), headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK
    data = response.json()
    assert_user_list_response(data)
    # 剩余用户数量（总共6个用户，前3个已跳过，剩余3个）
    assert len(data["users"]) == 3


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.permissions
@pytest.mark.asyncio
async def test_user_list_filtering(
    async_client: AsyncClient,
    test_data: TestData,
    superadmin_user_token_headers: dict,
    multiple_users,
    api_urls: APIConfig,
):
    """测试用户列表过滤功能"""
    # 测试只获取激活用户
    response = await async_client.get(
        api_urls.user_url("/?is_active=true"), headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK
    data = response.json()
    assert_user_list_response(data)

    # 验证所有返回的用户都是激活状态
    for user in data["users"]:
        assert user["is_active"] is True

    # 测试只获取非激活用户
    response = await async_client.get(
        api_urls.user_url("/?is_active=false"), headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK
    data = response.json()
    assert_user_list_response(data)

    # 验证所有返回的用户都是非激活状态
    for user in data["users"]:
        assert user["is_active"] is False


# ============================================================
# 跨用户操作权限测试
# ============================================================


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.permissions
@pytest.mark.asyncio
async def test_cross_user_access_restrictions(
    async_client: AsyncClient,
    test_data: TestData,
    admin_user: User,
    superadmin_user: User,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试跨用户访问限制"""
    # 普通用户不能获取其他用户信息
    response = await async_client.get(
        api_urls.user_url(f"/{admin_user.id}"), headers=normal_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.FORBIDDEN

    response = await async_client.get(
        api_urls.user_url(f"/{superadmin_user.id}"), headers=normal_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.FORBIDDEN

    # 普通用户不能更新其他用户信息
    response = await async_client.patch(
        api_urls.user_url(f"/{admin_user.id}"),
        json={"full_name": "Unauthorized Update"},
        headers=normal_user_token_headers,
    )
    assert response.status_code == test_data.StatusCodes.FORBIDDEN

    # 普通用户不能删除其他用户
    response = await async_client.delete(
        api_urls.user_url(f"/{admin_user.id}"), headers=normal_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.FORBIDDEN


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.permissions
@pytest.mark.asyncio
async def test_admin_cross_user_restrictions(
    async_client: AsyncClient,
    test_data: TestData,
    normal_user: User,
    superadmin_user: User,
    admin_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试管理员跨用户访问限制"""
    # ✅ 管理员现在可以获取其他用户信息（权限放宽）
    response = await async_client.get(
        api_urls.user_url(f"/{normal_user.id}"), headers=admin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK

    response = await async_client.get(
        api_urls.user_url(f"/{superadmin_user.id}"), headers=admin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK

    # ✅ 管理员现在可以更新其他用户信息
    response = await async_client.patch(
        api_urls.user_url(f"/{normal_user.id}"),
        json={"full_name": "Admin Update"},
        headers=admin_user_token_headers,
    )
    assert response.status_code == test_data.StatusCodes.OK

    # ✅ 管理员现在可以删除其他用户
    response = await async_client.delete(
        api_urls.user_url(f"/{normal_user.id}"), headers=admin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.NO_CONTENT


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.permissions
@pytest.mark.asyncio
async def test_permission_boundary_edge_cases(
    async_client: AsyncClient,
    test_data: TestData,
    superadmin_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试权限边界的边缘情况"""
    # 测试访问不存在的用户
    fake_uuid = "019b0000-0000-7000-8000-000000000000"
    response = await async_client.get(
        api_urls.user_url(f"/{fake_uuid}"), headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.NOT_FOUND
    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.USER_NOT_FOUND)

    # 测试更新不存在的用户
    response = await async_client.patch(
        api_urls.user_url(f"/{fake_uuid}"),
        json={"full_name": "Update Nonexistent"},
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == test_data.StatusCodes.NOT_FOUND
    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.USER_NOT_FOUND)

    # 测试删除不存在的用户
    response = await async_client.delete(
        api_urls.user_url(f"/{fake_uuid}"), headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.NOT_FOUND
    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.USER_NOT_FOUND)


# ============================================================
# 角色混合场景测试
# ============================================================


@pytest.mark.integration
@pytest.mark.users
@pytest.mark.permissions
@pytest.mark.asyncio
async def test_mixed_role_interactions(
    async_client: AsyncClient,
    test_data: TestData,
    superadmin_user_token_headers: dict,
    api_urls: APIConfig,
    mixed_role_users,
):
    """测试混合角色用户交互"""
    # 获取用户列表，验证包含不同角色
    response = await async_client.get(
        api_urls.user_url("/"), headers=superadmin_user_token_headers
    )
    assert response.status_code == test_data.StatusCodes.OK
    data = response.json()

    # mixed_role_users创建了3个不同角色的用户，加上superadmin_user，总共4个
    assert len(data["users"]) == 4

    # 验证包含不同角色
    roles = [user["role"] for user in data["users"]]
    assert "user" in roles
    assert "admin" in roles
    assert "superadmin" in roles

    # 验证超级管理员可以操作所有角色的用户
    for user_data in data["users"]:
        if user_data["role"] != "superadmin":  # 不操作自己
            user_id = user_data["id"]

            # 可以获取用户信息
            response = await async_client.get(
                api_urls.user_url(f"/{user_id}"), headers=superadmin_user_token_headers
            )
            assert response.status_code == test_data.StatusCodes.OK

            # 可以更新用户信息
            response = await async_client.patch(
                api_urls.user_url(f"/{user_id}"),
                json={"full_name": f"Updated {user_data['role']} User"},
                headers=superadmin_user_token_headers,
            )
            assert response.status_code == test_data.StatusCodes.OK
