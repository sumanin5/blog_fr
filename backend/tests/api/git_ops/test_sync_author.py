"""
测试 Git 同步的作者字段功能
"""

from pathlib import Path

import pytest
from app.core.config import settings
from app.posts.model import Post
from httpx import AsyncClient
from sqlmodel import select


@pytest.mark.asyncio
async def test_sync_with_valid_author(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    superadmin_user,
    session,
):
    """测试：MDX 文件包含有效的作者"""
    # 保存 ID 以避免 lazy load 问题
    author_id = superadmin_user.id

    # 创建文件（使用 superadmin 的用户名）
    post_file = mock_content_dir / "post-with-author.mdx"
    post_file.write_text(
        f"""---
title: "Post with Author"
slug: "post-with-author"
author: "{superadmin_user.username}"
---

Content here.
""",
        encoding="utf-8",
    )

    # 同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["added"]) == 2  # 包含文章 + 自动创建的分类 index.md
    assert len(data["errors"]) == 0

    # 验证作者
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "post-with-author.mdx")
    result = await session.exec(stmt)
    post = result.one()
    await session.refresh(post)

    assert post.author_id == author_id


@pytest.mark.asyncio
async def test_sync_without_author_field(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    session,
):
    """测试：MDX 文件缺少 author 字段"""
    # 创建文件（没有 author 字段）
    post_file = mock_content_dir / "post-no-author.mdx"
    post_file.write_text(
        """---
title: "Post without Author"
slug: "post-no-author"
---

Content here.
""",
        encoding="utf-8",
    )

    # 同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )

    # 当同步过程中只有错误而没有成功操作时,API 返回 400
    assert response.status_code == 400
    data = response.json()

    # 验证错误信息(错误响应格式: {"error": {"code": ..., "message": ...}})
    assert "error" in data
    assert "Sync failed" in data["error"]["message"]
    assert "Missing required field 'author'" in data["error"]["message"]

    # 验证文章未创建
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "post-no-author.mdx")
    result = await session.exec(stmt)
    post = result.one_or_none()

    assert post is None


@pytest.mark.asyncio
async def test_sync_with_nonexistent_author(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    session,
):
    """测试：MDX 文件指定的作者不存在"""
    # 创建文件（作者不存在）
    post_file = mock_content_dir / "post-invalid-author.mdx"
    post_file.write_text(
        """---
title: "Post with Invalid Author"
slug: "post-invalid-author"
author: "nonexistent_user"
---

Content here.
""",
        encoding="utf-8",
    )

    # 同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )

    # 当同步过程中只有错误而没有成功操作时,API 返回 400
    assert response.status_code == 400
    data = response.json()

    # 验证错误信息(错误响应格式: {"error": {"code": ..., "message": ...}})
    assert "error" in data
    assert "Sync failed" in data["error"]["message"]
    assert "Author not found" in data["error"]["message"]

    # 验证文章未创建
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "post-invalid-author.mdx")
    result = await session.exec(stmt)
    post = result.one_or_none()

    assert post is None


@pytest.mark.asyncio
async def test_sync_with_author_uuid(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    superadmin_user,
    session,
):
    """测试：MDX 文件使用 UUID 指定作者"""
    # 保存 ID 以避免 lazy load 问题
    author_id = superadmin_user.id

    # 创建文件（使用 UUID）
    post_file = mock_content_dir / "post-with-uuid.mdx"
    post_file.write_text(
        f"""---
title: "Post with UUID Author"
slug: "post-with-uuid"
author: "{author_id}"
---

Content here.
""",
        encoding="utf-8",
    )

    # 同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["added"]) == 2  # 包含文章 + 自动创建的分类 index.md
    assert len(data["errors"]) == 0

    # 验证作者
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "post-with-uuid.mdx")
    result = await session.exec(stmt)
    post = result.one()
    await session.refresh(post)

    assert post.author_id == author_id
