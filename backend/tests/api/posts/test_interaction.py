"""
文章互动功能测试 (Likes & Bookmarks)

测试内容：
- 点赞/收藏计数递增
- 点赞/收藏计数递减
- 非负性检查（不应该减到负数）
- 匿名访问（不需要登录）
"""

import pytest
from app.posts.model import Post
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig


@pytest.mark.asyncio
@pytest.mark.posts
async def test_like_post_increment(
    async_client: AsyncClient,
    test_post: Post,
    api_urls: APIConfig,
):
    """测试点赞递增"""
    initial_likes = test_post.like_count

    # 点赞
    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}/like"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["like_count"] == initial_likes + 1


@pytest.mark.asyncio
@pytest.mark.posts
async def test_like_post_decrement(
    async_client: AsyncClient,
    test_post: Post,
    api_urls: APIConfig,
    session,
):
    """测试取消点赞递减"""
    # 先手动设置点赞数为 5
    test_post.like_count = 5
    session.add(test_post)
    await session.commit()

    # 取消点赞
    response = await async_client.delete(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}/like"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["like_count"] == 4


@pytest.mark.asyncio
@pytest.mark.posts
async def test_like_count_non_negative(
    async_client: AsyncClient,
    test_post: Post,
    api_urls: APIConfig,
    session,
):
    """测试点赞数不会减到负数"""
    # 确保当前是 0
    test_post.like_count = 0
    session.add(test_post)
    await session.commit()

    # 尝试取消点赞
    response = await async_client.delete(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}/like"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["like_count"] == 0  # 保持为 0


@pytest.mark.asyncio
@pytest.mark.posts
async def test_bookmark_post_increment(
    async_client: AsyncClient,
    test_post: Post,
    api_urls: APIConfig,
):
    """测试收藏递增"""
    initial_bookmarks = test_post.bookmark_count

    # 收藏
    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}/bookmark"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["bookmark_count"] == initial_bookmarks + 1


@pytest.mark.asyncio
@pytest.mark.posts
async def test_bookmark_post_decrement(
    async_client: AsyncClient,
    test_post: Post,
    api_urls: APIConfig,
    session,
):
    """测试取消收藏递减"""
    # 先手动设置收藏数为 3
    test_post.bookmark_count = 3
    session.add(test_post)
    await session.commit()

    # 取消收藏
    response = await async_client.delete(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}/bookmark"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["bookmark_count"] == 2


@pytest.mark.asyncio
@pytest.mark.posts
async def test_interaction_nonexistent_post(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试对不存在的文章进行操作"""
    from uuid import uuid4

    post_id = uuid4()

    # 点赞
    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/article/{post_id}/like"
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
