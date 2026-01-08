"""
文章删除接口测试

测试内容：
- 删除文章
- 权限控制
"""

import pytest
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig

# ============================================================
# 文章删除测试
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_delete_post_as_author(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
    session,
    normal_user,
):
    """测试作者删除自己的文章"""
    # 创建一个测试文章用于删除
    from app.posts.model import Post, PostStatus, PostType

    post = Post(
        title="待删除的文章",
        slug="to-delete",
        content_mdx="# 内容",
        content_html="<h1>内容</h1>",
        post_type=PostType.ARTICLE,
        status=PostStatus.DRAFT,
        author_id=normal_user.id,
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)

    response = await async_client.delete(
        f"{api_urls.API_PREFIX}/posts/article/{post.id}",
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_204_NO_CONTENT

    # 验证文章已被删除
    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/article/{post.id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND


# ============================================================
# 权限测试
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_delete_post_without_login(
    async_client: AsyncClient,
    test_post,
    api_urls: APIConfig,
):
    """测试未登录删除文章（应该失败）"""
    response = await async_client.delete(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}"
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
@pytest.mark.posts
async def test_delete_other_user_post(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    test_post,
    api_urls: APIConfig,
):
    """测试普通管理员删除他人文章（应该失败）"""
    response = await async_client.delete(
        f"{api_urls.API_PREFIX}/posts/article/{test_post.id}",
        headers=admin_user_token_headers,
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
@pytest.mark.posts
async def test_delete_post_as_superadmin(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    api_urls: APIConfig,
    session,
    normal_user,
):
    """测试超级管理员删除任何文章"""
    # 创建一个测试文章
    from app.posts.model import Post, PostStatus, PostType

    post = Post(
        title="超管删除测试",
        slug="superadmin-delete-test",
        content_mdx="# 内容",
        content_html="<h1>内容</h1>",
        post_type=PostType.ARTICLE,
        status=PostStatus.PUBLISHED,
        author_id=normal_user.id,
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)

    response = await async_client.delete(
        f"{api_urls.API_PREFIX}/posts/article/{post.id}",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.asyncio
@pytest.mark.posts
async def test_delete_nonexistent_post(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试删除不存在的文章"""
    from uuid import uuid4

    response = await async_client.delete(
        f"{api_urls.API_PREFIX}/posts/article/{uuid4()}",
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
