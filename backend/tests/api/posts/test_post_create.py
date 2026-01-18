"""
文章创建接口测试

测试内容：
- 创建文章（草稿、已发布）
- 关联分类和标签
- 权限控制
- 数据验证
"""

import pytest
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig, TestData
from tests.api.posts.conftest import (
    assert_post_detail,
)

# ============================================================
# 文章创建测试
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_create_post_draft(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试创建草稿文章"""
    post_data = {
        "title": "草稿文章",
        "content_mdx": "# 标题\n\n这是草稿内容",
        "post_type": "article",
        "status": "draft",
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article",
        json=post_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert_post_detail(data)
    assert data["title"] == "草稿文章"
    assert data["status"] == "draft"
    assert data["slug"] is not None  # 自动生成 slug
    assert data["content_ast"] is not None  # 自动生成 AST
    assert data["toc"] is not None  # 自动生成目录


@pytest.mark.asyncio
@pytest.mark.posts
async def test_create_post_published(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试创建已发布文章"""
    post_data = {
        "title": "已发布文章",
        "content_mdx": "# 标题\n\n这是已发布内容",
        "post_type": "article",
        "status": "published",
        "excerpt": "这是摘要",
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article",
        json=post_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert_post_detail(data)
    assert data["title"] == "已发布文章"
    assert data["status"] == "published"
    assert data["excerpt"] == "这是摘要"


@pytest.mark.asyncio
@pytest.mark.posts
async def test_create_post_with_custom_slug(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试创建文章时手动指定 slug

    注意：按照设计，即使手动指定 slug，后端也会添加 6 位随机后缀确保唯一性
    格式：my-custom-slug-xxxxxx
    """
    post_data = {
        "title": "自定义 Slug",
        "slug": "my-custom-slug",
        "content_mdx": "# 标题\n\n内容",
        "post_type": "article",
        "status": "draft",
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article",
        json=post_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    # 断言：slug 以指定的前缀开头，并且跟着 6 位随机字符
    assert data["slug"].startswith("my-custom-slug-")
    assert len(data["slug"]) == len("my-custom-slug-") + 6  # 前缀 + 连字符 + 6位随机


@pytest.mark.asyncio
@pytest.mark.posts
async def test_create_post_with_duplicate_slug(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试创建文章时 slug 总是添加后缀

    即使用户指定相同的 slug，由于总是添加随机后缀，所以不会冲突
    """
    # 1. 创建第一篇文章
    post_data_1 = {
        "title": "第一篇文章",
        "slug": "duplicate-slug",
        "content_mdx": "# 第一篇",
        "post_type": "article",
        "status": "draft",
    }

    response_1 = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article",
        json=post_data_1,
        headers=normal_user_token_headers,
    )

    assert response_1.status_code == status.HTTP_201_CREATED
    data_1 = response_1.json()
    assert data_1["slug"].startswith("duplicate-slug-")  # 第一次也会添加后缀

    # 2. 创建第二篇文章，使用相同的 slug
    post_data_2 = {
        "title": "第二篇文章",
        "slug": "duplicate-slug",  # 相同的 slug
        "content_mdx": "# 第二篇",
        "post_type": "article",
        "status": "draft",
    }

    response_2 = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article",
        json=post_data_2,
        headers=normal_user_token_headers,
    )

    assert response_2.status_code == status.HTTP_201_CREATED
    data_2 = response_2.json()

    # 断言：两篇文章都有后缀，且后缀不同
    assert data_2["slug"].startswith("duplicate-slug-")
    assert data_2["slug"] != data_1["slug"]  # 确保两个 slug 不同（后缀不同）


@pytest.mark.asyncio
@pytest.mark.posts
async def test_create_post_with_category(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    test_category,
    api_urls: APIConfig,
):
    """测试创建文章并关联分类"""
    post_data = {
        "title": "带分类的文章",
        "content_mdx": "# 标题\n\n内容",
        "post_type": "article",
        "status": "draft",
        "category_id": str(test_category.id),
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article",
        json=post_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["category"] is not None
    assert data["category"]["id"] == str(test_category.id)


@pytest.mark.asyncio
@pytest.mark.posts
async def test_create_post_with_tags(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试创建文章并添加标签"""
    post_data = {
        "title": "带标签的文章",
        "content_mdx": "# 标题\n\n内容",
        "post_type": "article",
        "status": "draft",
        "tags": ["Python", "FastAPI", "新标签"],  # 包含已存在和新标签
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article",
        json=post_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["tags"] is not None
    assert len(data["tags"]) == 3
    assert any(tag["name"] == "Python" for tag in data["tags"])
    assert any(tag["name"] == "新标签" for tag in data["tags"])


@pytest.mark.asyncio
@pytest.mark.posts
async def test_create_post_as_idea_type(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试创建想法类型的文章"""
    post_data = {
        "title": "关于我",
        "content_mdx": "# 关于我\n\n这是关于想法",
        "post_type": "idea",
        "status": "published",
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/idea",
        json=post_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["post_type"] == "idea"


# ============================================================
# 权限测试
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_create_post_without_login(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试未登录创建文章（应该失败）"""
    post_data = {
        "title": "测试文章",
        "content_mdx": "# 标题\n\n内容",
        "post_type": "article",
        "status": "draft",
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article",
        json=post_data,
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ============================================================
# 数据验证测试
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_create_post_missing_required_fields(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试创建文章时缺少必需字段"""
    # 缺少 title
    post_data = {
        "content_mdx": "# 标题\n\n内容",
        "post_type": "article",
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article",
        json=post_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
@pytest.mark.posts
async def test_create_post_with_invalid_category(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
    test_data: TestData,
):
    """测试创建文章时使用不存在的分类"""
    from uuid import uuid4

    post_data = {
        "title": "测试文章",
        "content_mdx": "# 标题\n\n内容",
        "post_type": "article",
        "status": "draft",
        "category_id": str(uuid4()),
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article",
        json=post_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
