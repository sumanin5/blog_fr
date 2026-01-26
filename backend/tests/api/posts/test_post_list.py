"""
文章列表查询测试

测试内容：
- 获取文章列表
- 分页查询
- 按分类/标签筛选
- 按状态筛选
- 性能验证（列表不返回正文）
"""

import pytest
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig
from tests.api.posts.conftest import assert_post_list_item

# ============================================================
# 文章列表查询测试（公开接口）
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_posts_list(
    async_client: AsyncClient,
    multiple_posts: list,
    api_urls: APIConfig,
):
    """测试获取文章列表（公开接口，无需登录）"""
    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/articles")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "size" in data

    assert len(data["items"]) >= 4  # 至少有 4 篇已发布文章

    # 验证每个文章的格式（不包含正文）
    for post in data["items"]:
        assert_post_list_item(post)


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_posts_list_pagination(
    async_client: AsyncClient,
    multiple_posts: list,
    api_urls: APIConfig,
):
    """测试文章列表分页"""
    # 第一页，每页 2 条
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/articles?page=1&size=2"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["items"]) == 2
    assert data["page"] == 1
    assert data["size"] == 2

    # 第二页
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/articles?page=2&size=2"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["page"] == 2


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_posts_by_category(
    async_client: AsyncClient,
    multiple_posts: list,
    test_category,
    api_urls: APIConfig,
):
    """测试按分类筛选文章"""
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/articles?category_id={test_category.id}"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["items"]) >= 4

    # 验证所有文章都属于该分类
    for post in data["items"]:
        if post.get("category"):
            assert post["category"]["id"] == str(test_category.id)


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_posts_by_tag(
    async_client: AsyncClient,
    post_with_tags,
    api_urls: APIConfig,
):
    """测试按标签筛选文章"""
    # 获取第一个标签的 ID
    tag_id = post_with_tags.tags[0].id

    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/articles?tag_id={tag_id}"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["items"]) >= 1

    # 验证返回的文章都包含该标签
    for post in data["items"]:
        tag_ids = [tag["id"] for tag in post.get("tags", [])]
        assert str(tag_id) in tag_ids


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_posts_by_status(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    test_post,
    draft_post,
    api_urls: APIConfig,
):
    """测试按状态筛选文章（需要登录）"""
    # 获取已发布文章（公开接口）
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/articles?status=published"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert all(post["status"] == "published" for post in data["items"])

    # 获取草稿文章（需要登录）
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/articles?status=draft",
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    # 应该只返回当前用户的草稿
    for post in data["items"]:
        assert post["status"] == "draft"


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_posts_list_performance(
    async_client: AsyncClient,
    multiple_posts: list,
    api_urls: APIConfig,
):
    """测试列表查询性能优化：不返回正文字段"""
    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/articles")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # 验证列表项不包含大字段
    for post in data["items"]:
        assert "content_mdx" not in post
        assert "content_ast" not in post
        assert "toc" not in post


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_posts_by_post_type(
    async_client: AsyncClient,
    api_urls: APIConfig,
    normal_user_token_headers: dict,
):
    """测试按文章类型查询"""
    # 创建一个想法类型的文章
    idea_data = {
        "title": "关于想法",
        "content_mdx": "# 关于\n\n内容",
        "post_type": "ideas",
        "status": "published",
    }

    await async_client.post(
        f"{api_urls.API_PREFIX}/posts/ideas",
        json=idea_data,
        headers=normal_user_token_headers,
    )

    # 查询文章类型
    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/articles")
    data = response.json()
    assert all(post["post_type"] == "articles" for post in data["items"])

    # 查询想法类型
    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/ideas")
    data = response.json()
    assert any(post["post_type"] == "ideas" for post in data["items"])


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_posts_search(
    async_client: AsyncClient,
    test_post,
    api_urls: APIConfig,
):
    """测试文章搜索"""
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/articles?search={test_post.title}"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["items"]) >= 1
    assert any(test_post.title in post["title"] for post in data["items"])


# ============================================================
# 用户文章列表查询测试（需要登录）
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_my_posts(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    test_post,
    draft_post,
    api_urls: APIConfig,
):
    """测试获取当前用户的文章列表"""
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/me",
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["items"]) >= 2  # 至少有测试文章和草稿文章

    # 验证所有文章都属于当前用户
    for post in data["items"]:
        assert post["author"]["id"] is not None


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_my_posts_without_login(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试未登录获取我的文章列表（应该失败）"""
    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/me")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
