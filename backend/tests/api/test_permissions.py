import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_normal_user_permissions(async_client: AsyncClient, normal_user_token_headers: dict):
    """
    测试普通用户权限
    """
    # 1. 测试获取自己的信息 (应该成功)
    response = await async_client.get("/users/me", headers=normal_user_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "normal_user"
    assert data["role"] == "user"

@pytest.mark.asyncio
async def test_admin_user_permissions(async_client: AsyncClient, admin_user_token_headers: dict):
    """
    测试管理员用户权限
    """
    # 1. 测试获取自己的信息 (应该成功)
    response = await async_client.get("/users/me", headers=admin_user_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin_user"
    assert data["role"] == "admin"

@pytest.mark.asyncio
async def test_superadmin_user_permissions(async_client: AsyncClient, superadmin_user_token_headers: dict):
    """
    测试超级管理员用户权限
    """
    # 1. 测试获取自己的信息 (应该成功)
    response = await async_client.get("/users/me", headers=superadmin_user_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "superadmin_user"
    assert data["role"] == "superadmin"
