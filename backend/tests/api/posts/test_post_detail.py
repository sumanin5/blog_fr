"""
文章详情查询测试

测试内容：
- 通过 ID 获取文章详情
- 通过 Slug 获取文章详情
- 验证详情包含完整内容
"""

import pytest
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig
from tests.api.posts.conftest import assert_post_detail

# ============================================================
# 文章详情查询测试
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_post_by_id(
    async_client: AsyncClient,
    test_post,
    api_urls: APIConfig,
):
    """测试通过 ID 获取文章详情"""
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert_post_detail(data)
    assert data["id"] == str(test_post.id)
    assert data["title"] == test_post.title
    assert data["slug"] == test_post.slug

    # 验证包含完整内容
    assert data["content_mdx"] is not None
    assert data["content_html"] is not None
    assert data["toc"] is not None


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_post_by_slug(
    async_client: AsyncClient,
    test_post,
    api_urls: APIConfig,
):
    """测试通过 Slug 获取文章详情"""
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/article/slug/{test_post.slug}"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert_post_detail(data)
    assert data["slug"] == test_post.slug
    assert data["id"] == str(test_post.id)


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_post_with_category(
    async_client: AsyncClient,
    test_post,
    api_urls: APIConfig,
):
    """测试获取包含分类的文章详情"""
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["category"] is not None
    assert "id" in data["category"]
    assert "name" in data["category"]
    assert "slug" in data["category"]


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_post_with_tags(
    async_client: AsyncClient,
    post_with_tags,
    api_urls: APIConfig,
):
    """测试获取包含标签的文章详情"""
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/article/{post_with_tags.id}"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["tags"] is not None
    assert len(data["tags"]) >= 3
    for tag in data["tags"]:
        assert "id" in tag
        assert "name" in tag
        assert "slug" in tag


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_post_with_author(
    async_client: AsyncClient,
    test_post,
    api_urls: APIConfig,
):
    """测试获取包含作者信息的文章详情"""
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["author"] is not None
    assert "id" in data["author"]
    assert "username" in data["author"]
    assert "email" in data["author"]


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_nonexistent_post(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试获取不存在的文章"""
    from uuid import uuid4

    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/article/{uuid4()}")

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_nonexistent_post_by_slug(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试通过不存在的 slug 获取文章"""
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/article/slug/nonexistent-slug"
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


# ============================================================
# 草稿文章访问权限测试
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_draft_post_as_author(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    draft_post,
    api_urls: APIConfig,
):
    """测试作者访问自己的草稿文章"""
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/article/{draft_post.id}",
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "draft"


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_draft_post_without_login(
    async_client: AsyncClient,
    draft_post,
    api_urls: APIConfig,
):
    """测试未登录访问草稿文章（应该失败）"""
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/article/{draft_post.id}"
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_draft_post_as_other_user(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    draft_post,
    api_urls: APIConfig,
):
    """测试其他用户访问草稿文章（普通管理员应该失败）"""
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/article/{draft_post.id}",
        headers=admin_user_token_headers,
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_draft_post_as_superadmin(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    draft_post,
    api_urls: APIConfig,
):
    """测试超级管理员访问任何草稿文章"""
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/article/{draft_post.id}",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "draft"
