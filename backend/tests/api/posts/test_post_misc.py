"""
文章模块杂项测试

测试内容：
- 板块类型元数据 (Metadata)
- 文章预览功能 (Preview)
- 边缘情况路由测试 (Edge cases)
"""

import pytest
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_post_types(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试获取板块类型列表"""
    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/types")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2

    # 验证结构
    first_item = data[0]
    assert "value" in first_item
    assert "label" in first_item


@pytest.mark.asyncio
@pytest.mark.posts
async def test_preview_post(
    async_client: AsyncClient,
    api_urls: APIConfig,
    superadmin_user_token_headers: dict,
):
    """测试文章内容预览 (MDX -> HTML)"""
    mdx_content = "# Hello Preview\n\nPreview Content."
    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/preview",
        json={"content_mdx": mdx_content},
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "content_ast" in data


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_post_by_slug_wrong_type(
    async_client: AsyncClient,
    test_post,
    api_urls: APIConfig,
):
    """测试通过 Slug 获取文章但类型不匹配"""
    # test_post 是 article 类型, 尝试用 idea 路径访问
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/idea/slug/{test_post.slug}"
    )

    # 即使 slug 存在，但类型不对也应返回 404
    assert response.status_code == status.HTTP_404_NOT_FOUND
