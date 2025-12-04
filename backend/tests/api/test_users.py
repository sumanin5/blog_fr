import pytest
from httpx import AsyncClient
from fastapi import status

# ============================================================
# 注册测试
# ============================================================

@pytest.mark.asyncio
async def test_register_user_success(async_client: AsyncClient):
    """测试用户注册成功"""
    response = await async_client.post(
        "/users/register",
        json={
            "username": "testuser",
            "email": "testuser@example.com",
            "password": "password123",
            "full_name": "Test User"
        },
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "testuser@example.com"
    assert "id" in data
    assert "hashed_password" not in data  # 确保密码哈希不返回

@pytest.mark.asyncio
async def test_register_user_duplicate_username(async_client: AsyncClient):
    """测试注册重复用户名"""
    # 先注册一个用户
    await async_client.post(
        "/users/register",
        json={
            "username": "duplicateuser",
            "email": "first@example.com",
            "password": "password123",
        },
    )

    # 尝试注册相同用户名的用户
    response = await async_client.post(
        "/users/register",
        json={
            "username": "duplicateuser",
            "email": "second@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Username already registered"

@pytest.mark.asyncio
async def test_register_user_duplicate_email(async_client: AsyncClient):
    """测试注册重复邮箱"""
    # 先注册一个用户
    await async_client.post(
        "/users/register",
        json={
            "username": "user1",
            "email": "duplicate@example.com",
            "password": "password123",
        },
    )

    # 尝试注册相同邮箱的用户
    response = await async_client.post(
        "/users/register",
        json={
            "username": "user2",
            "email": "duplicate@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Email already registered"

# ============================================================
# 登录测试
# ============================================================

@pytest.mark.asyncio
async def test_login_success(async_client: AsyncClient):
    """测试用户登录成功"""
    # 先注册
    password = "password123"
    await async_client.post(
        "/users/register",
        json={
            "username": "loginuser",
            "email": "login@example.com",
            "password": password,
        },
    )

    # 登录
    # 注意：OAuth2PasswordRequestForm 期望的是表单数据 (application/x-www-form-urlencoded)
    # 而不是 JSON 数据
    response = await async_client.post(
        "/users/login",
        data={
            "username": "loginuser",
            "password": password,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_wrong_password(async_client: AsyncClient):
    """测试错误密码登录"""
    # 先注册
    await async_client.post(
        "/users/register",
        json={
            "username": "wrongpassuser",
            "email": "wrongpass@example.com",
            "password": "password123",
        },
    )

    # 尝试用错误密码登录
    response = await async_client.post(
        "/users/login",
        data={
            "username": "wrongpassuser",
            "password": "wrongpassword",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Incorrect username or password"

@pytest.mark.asyncio
async def test_login_nonexistent_user(async_client: AsyncClient):
    """测试不存在的用户登录"""
    response = await async_client.post(
        "/users/login",
        data={
            "username": "nonexistent",
            "password": "password123",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
