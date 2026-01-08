"""
文章更新接口测试

测试内容：
- 更新文章内容
- 更新文章状态
- 更新分类和标签
- 权限控制
"""

import pytest
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig

# ============================================================
# 文章更新测试
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_update_post_as_author(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    test_post,
    api_urls: APIConfig,
):
    """测试作者更新自己的文章"""
    update_data = {
        "title": "更新后的标题",
        "excerpt": "更新后的摘要",
    }

    response = await async_client.patch(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}",
        json=update_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == "更新后的标题"
    assert data["excerpt"] == "更新后的摘要"


@pytest.mark.asyncio
@pytest.mark.posts
async def test_update_post_content(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    test_post,
    api_urls: APIConfig,
):
    """测试更新文章内容"""
    update_data = {
        "content_mdx": "# 新标题\n\n新内容",
    }

    response = await async_client.patch(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}",
        json=update_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["content_mdx"] == "# 新标题\n\n新内容"
    assert data["content_html"] is not None  # 应该自动更新 HTML


@pytest.mark.asyncio
@pytest.mark.posts
async def test_update_post_status(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    draft_post,
    api_urls: APIConfig,
):
    """测试更新文章状态（草稿→已发布）"""
    update_data = {
        "status": "published",
    }

    response = await async_client.patch(
        f"{api_urls.API_PREFIX}/posts/article/{draft_post.id}",
        json=update_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "published"


@pytest.mark.asyncio
@pytest.mark.posts
async def test_update_post_category(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    test_post,
    api_urls: APIConfig,
    session,
):
    """测试更新文章分类"""
    # 创建新分类
    from app.posts.model import Category, PostType

    new_category = Category(
        name="新分类",
        slug="new-cat",
        post_type=PostType.ARTICLE,
    )
    session.add(new_category)
    await session.commit()
    await session.refresh(new_category)

    update_data = {
        "category_id": str(new_category.id),
    }

    response = await async_client.patch(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}",
        json=update_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["category"]["id"] == str(new_category.id)


@pytest.mark.asyncio
@pytest.mark.posts
async def test_update_post_tags(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    test_post,
    api_urls: APIConfig,
):
    """测试更新文章标签"""
    update_data = {
        "tags": ["新标签1", "新标签2"],
    }

    response = await async_client.patch(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}",
        json=update_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["tags"]) == 2
    assert any(tag["name"] == "新标签1" for tag in data["tags"])


# ============================================================
# 权限测试
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_update_post_without_login(
    async_client: AsyncClient,
    test_post,
    api_urls: APIConfig,
):
    """测试未登录更新文章（应该失败）"""
    update_data = {"title": "尝试更新"}

    response = await async_client.patch(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}",
        json=update_data,
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
@pytest.mark.posts
async def test_update_other_user_post(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    test_post,
    api_urls: APIConfig,
):
    """测试普通管理员更新他人文章（应该失败）"""
    update_data = {"title": "尝试更新他人文章"}

    response = await async_client.patch(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}",
        json=update_data,
        headers=admin_user_token_headers,
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
@pytest.mark.posts
async def test_update_post_as_superadmin(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    test_post,
    api_urls: APIConfig,
):
    """测试超级管理员更新任何文章"""
    update_data = {"title": "超级管理员更新"}

    response = await async_client.patch(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}",
        json=update_data,
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == "超级管理员更新"


@pytest.mark.asyncio
@pytest.mark.posts
async def test_update_nonexistent_post(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试更新不存在的文章"""
    from uuid import uuid4

    update_data = {"title": "更新"}

    response = await async_client.patch(
        f"{api_urls.API_PREFIX}/posts/article/{uuid4()}",
        json=update_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
