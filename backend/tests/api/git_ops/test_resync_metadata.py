"""
GitOps 重新同步元数据 API 测试

测试 POST /api/git-ops/posts/{post_id}/resync-metadata 端点
"""

import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_resync_metadata_success(
    async_client: AsyncClient,
    session: AsyncSession,
    superadmin_user_token_headers,
    resync_test_post,
):
    """测试成功重新同步元数据"""
    post, test_file, new_author = resync_test_post
    post_id = post.id  # 提前获取 ID，避免后续访问触发懒加载

    # 调用 resync API
    from app.core.config import settings

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/posts/{post_id}/resync-metadata",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["post_id"] == str(post_id)
    assert data["source_path"] == "test-resync.mdx"
    assert data["updated_fields"]["author_id"] == str(new_author.id)

    # 验证文件已回签新 ID
    content = test_file.read_text(encoding="utf-8")
    assert str(new_author.id) in content


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_resync_metadata_post_not_found(
    async_client: AsyncClient,
    superadmin_user_token_headers,
    mock_content_dir,
):
    """测试文章不存在"""
    from uuid import uuid4

    from app.core.config import settings

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/posts/{uuid4()}/resync-metadata",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 400
    assert "not found" in response.json()["error"]["message"].lower()


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_resync_metadata_no_source_path(
    async_client: AsyncClient,
    session: AsyncSession,
    superadmin_user_token_headers,
    mock_content_dir,
):
    """测试文章没有 source_path"""
    from app.posts.model import Post, PostStatus, PostType
    from app.users.model import User, UserRole

    # 创建测试用户
    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password="hashed",
        role=UserRole.USER,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    # 创建没有 source_path 的文章
    post = Post(
        title="Manual Post",
        slug="manual-post",
        content_mdx="# Manual",
        status=PostStatus.PUBLISHED,
        post_type=PostType.ARTICLE,
        author_id=user.id,
        source_path=None,  # 没有 source_path
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)

    from app.core.config import settings

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/posts/{post.id}/resync-metadata",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 400
    assert "no source_path" in response.json()["error"]["message"].lower()


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_resync_metadata_file_not_found(
    async_client: AsyncClient,
    session: AsyncSession,
    superadmin_user_token_headers,
    mock_content_dir,
):
    """测试源文件不存在"""
    from app.posts.model import Post, PostStatus, PostType
    from app.users.model import User, UserRole

    # 创建测试用户
    user = User(
        username="testuser2",
        email="test2@example.com",
        hashed_password="hashed",
        role=UserRole.USER,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    # 创建有 source_path 但文件不存在的文章
    post = Post(
        title="Missing File Post",
        slug="missing-file-post",
        content_mdx="# Missing",
        status=PostStatus.PUBLISHED,
        post_type=PostType.ARTICLE,
        author_id=user.id,
        source_path="nonexistent.mdx",
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)

    from app.core.config import settings

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/posts/{post.id}/resync-metadata",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 400
    assert "not found" in response.json()["error"]["message"].lower()


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_resync_metadata_requires_admin(
    async_client: AsyncClient,
    session: AsyncSession,
    normal_user_token_headers,
):
    """测试需要管理员权限"""
    from uuid import uuid4

    from app.core.config import settings

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/posts/{uuid4()}/resync-metadata",
        headers=normal_user_token_headers,
    )

    assert response.status_code == 403
