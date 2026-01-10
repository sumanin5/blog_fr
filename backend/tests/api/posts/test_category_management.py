"""
分类管理接口测试

测试内容：
- 分类的增删改查
- 权限控制（只有超级管理员可以管理分类）
- 数据验证
"""

import pytest
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig, TestData, assert_error_response
from tests.api.posts.conftest import (
    PostTestData,
    assert_category_response,
)

# ============================================================
# 分类列表查询测试（公开接口）
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_categories_list(
    async_client: AsyncClient,
    multiple_categories: list,
    api_urls: APIConfig,
):
    """测试获取分类列表（公开接口，无需登录）"""
    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/article/categories")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # 适配 Page 响应格式
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)
    assert len(data["items"]) >= 3

    # 验证每个分类的格式
    for category in data["items"]:
        assert_category_response(category)


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_categories_by_post_type(
    async_client: AsyncClient,
    test_category,
    idea_category,
    api_urls: APIConfig,
):
    """测试按板块类型筛选分类"""
    # 获取 article 类型的分类
    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/article/categories")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # 适配 Page 响应格式
    assert "items" in data
    assert len(data["items"]) >= 1
    assert all(cat["post_type"] == "article" for cat in data["items"])

    # 获取 idea 类型的分类
    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/idea/categories")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "items" in data
    assert len(data["items"]) >= 1
    assert all(cat["post_type"] == "idea" for cat in data["items"])


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_categories_include_inactive(
    async_client: AsyncClient,
    session,
    api_urls: APIConfig,
):
    """测试获取包含未启用状态的分类"""
    from app.posts.model import Category, PostType

    # 创建一个未启用的分类
    inactive_cat = Category(
        name="未启用分类",
        slug="inactive-cat",
        post_type=PostType.ARTICLE,
        is_active=False,
    )
    session.add(inactive_cat)
    await session.commit()
    await session.refresh(inactive_cat)

    # 1. 默认查询（不包含未启用）
    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/article/categories")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert not any(cat["id"] == str(inactive_cat.id) for cat in data["items"])

    # 2. 包含未启用字段查询
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/article/categories",
        params={"include_inactive": "true"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert any(cat["id"] == str(inactive_cat.id) for cat in data["items"])


# ============================================================
# 分类创建测试（需要超级管理员权限）
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_create_category_success(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    post_test_data: PostTestData,
    api_urls: APIConfig,
):
    """测试超级管理员创建分类"""
    category_data = {
        "name": "新分类",
        "slug": "new-category",
        "post_type": "article",
        "description": "这是一个新分类",
        "sort_order": 1,  # 正确的字段名
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article/categories",
        json=category_data,
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert_category_response(data)
    assert data["name"] == "新分类"
    assert data["slug"] == "new-category"
    assert data["post_type"] == "article"


@pytest.mark.asyncio
@pytest.mark.posts
async def test_create_category_without_login(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试未登录创建分类（应该失败）"""
    category_data = {
        "name": "测试分类",
        "slug": "test-cat",
        "post_type": "article",
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article/categories",
        json=category_data,
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
@pytest.mark.posts
async def test_create_category_as_normal_user(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试普通用户创建分类（应该失败）"""
    category_data = {
        "name": "测试分类",
        "slug": "test-cat",
        "post_type": "article",
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article/categories",
        json=category_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
@pytest.mark.posts
async def test_create_category_as_admin(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试普通管理员创建分类（应该失败）"""
    category_data = {
        "name": "测试分类",
        "slug": "test-cat",
        "post_type": "article",
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article/categories",
        json=category_data,
        headers=admin_user_token_headers,
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
@pytest.mark.posts
async def test_create_category_duplicate_slug(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    test_category,
    api_urls: APIConfig,
    test_data: TestData,
):
    """测试创建重复 slug 的分类（应该失败）"""
    category_data = {
        "name": "重复的分类",
        "slug": test_category.slug,  # 使用已存在的 slug
        "post_type": "article",
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article/categories",
        json=category_data,
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    data = response.json()
    assert_error_response(data, test_data.ErrorCodes.SLUG_CONFLICT)


# ============================================================
# 分类更新测试（需要超级管理员权限）
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_update_category_success(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    test_category,
    api_urls: APIConfig,
):
    """测试超级管理员更新分类"""
    update_data = {
        "name": "更新后的分类名",
        "description": "更新后的描述",
        "sort_order": 10,  # 正确的字段名
    }

    response = await async_client.patch(
        f"{api_urls.API_PREFIX}/posts/article/categories/{test_category.id}",
        json=update_data,
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "更新后的分类名"
    assert data["description"] == "更新后的描述"
    assert data["sort_order"] == 10  # 正确的字段名
    assert data["slug"] == test_category.slug  # slug 不变


@pytest.mark.asyncio
@pytest.mark.posts
async def test_update_category_as_normal_user(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    test_category,
    api_urls: APIConfig,
):
    """测试普通用户更新分类（应该失败）"""
    update_data = {"name": "尝试更新"}

    response = await async_client.patch(
        f"{api_urls.API_PREFIX}/posts/article/categories/{test_category.id}",
        json=update_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
@pytest.mark.posts
async def test_update_nonexistent_category(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    api_urls: APIConfig,
    test_data: TestData,
):
    """测试更新不存在的分类"""
    from uuid import uuid4

    update_data = {"name": "更新"}

    response = await async_client.patch(
        f"{api_urls.API_PREFIX}/posts/article/categories/{uuid4()}",
        json=update_data,
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


# ============================================================
# 分类删除测试（需要超级管理员权限）
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_delete_category_success(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    api_urls: APIConfig,
    session,
):
    """测试超级管理员删除分类"""
    # 先创建一个分类用于删除
    from app.posts.model import Category, PostType

    category = Category(
        name="待删除的分类",
        slug="to-be-deleted",
        post_type=PostType.ARTICLE,
    )
    session.add(category)
    await session.commit()
    await session.refresh(category)

    response = await async_client.delete(
        f"{api_urls.API_PREFIX}/posts/article/categories/{category.id}",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == status.HTTP_204_NO_CONTENT

    # 验证分类已被删除
    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/article/categories")
    data = response.json()

    # 适配 Page 响应格式
    assert "items" in data
    assert not any(cat["id"] == str(category.id) for cat in data["items"])


@pytest.mark.asyncio
@pytest.mark.posts
async def test_delete_category_as_normal_user(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    test_category,
    api_urls: APIConfig,
):
    """测试普通用户删除分类（应该失败）"""
    response = await async_client.delete(
        f"{api_urls.API_PREFIX}/posts/article/categories/{test_category.id}",
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
@pytest.mark.posts
async def test_delete_nonexistent_category(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试删除不存在的分类"""
    from uuid import uuid4

    response = await async_client.delete(
        f"{api_urls.API_PREFIX}/posts/article/categories/{uuid4()}",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
