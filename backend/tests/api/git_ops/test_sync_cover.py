"""
测试 Git 同步的封面图关联功能
"""

from pathlib import Path

import pytest
from app.core.config import settings
from app.media.model import MediaFile
from app.posts.model import Post
from httpx import AsyncClient
from sqlmodel import select


@pytest.mark.asyncio
async def test_sync_with_valid_cover(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    superadmin_user,
    session,
):
    """测试：MDX 文件包含有效的封面图路径"""
    # 1. 先创建一个媒体文件
    media_file = MediaFile(
        original_filename="cover.jpg",
        file_path="images/2024/01/cover.jpg",
        file_size=1024,
        mime_type="image/jpeg",
        media_type="image",
        uploader_id=superadmin_user.id,
    )
    session.add(media_file)
    await session.commit()
    await session.refresh(media_file)

    # 保存 ID 以避免 lazy load 问题
    media_id = media_file.id

    # 2. 创建 MDX 文件（引用封面图）
    post_file = mock_content_dir / "post-with-cover.mdx"
    post_file.write_text(
        f"""---
title: "Post with Cover"
slug: "post-with-cover"
author: "{superadmin_user.username}"
cover: "images/2024/01/cover.jpg"
---

Content here.
""",
        encoding="utf-8",
    )

    # 3. 同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["added"]) == 1
    assert len(data["errors"]) == 0

    # 4. 验证封面图关联
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "post-with-cover.mdx")
    result = await session.exec(stmt)
    post = result.one()
    await session.refresh(post)

    assert post.cover_media_id == media_id


@pytest.mark.asyncio
async def test_sync_with_nonexistent_cover(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    superadmin_user,
    session,
):
    """测试：MDX 文件引用不存在的封面图"""
    # 创建 MDX 文件（封面图不存在）
    post_file = mock_content_dir / "post-invalid-cover.mdx"
    post_file.write_text(
        f"""---
title: "Post with Invalid Cover"
slug: "post-invalid-cover"
author: "{superadmin_user.username}"
cover: "images/nonexistent.jpg"
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

    # 文章应该创建成功，但封面为空
    assert len(data["added"]) == 1
    assert len(data["errors"]) == 0

    # 验证封面为空
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "post-invalid-cover.mdx")
    result = await session.exec(stmt)
    post = result.one()

    assert post.cover_media_id is None


@pytest.mark.asyncio
async def test_sync_with_cover_by_filename(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    superadmin_user,
    session,
):
    """测试：MDX 文件使用文件名匹配封面图"""
    # 1. 创建媒体文件
    media_file = MediaFile(
        original_filename="my-cover.jpg",
        file_path="images/2024/01/abc123_my-cover.jpg",
        file_size=1024,
        mime_type="image/jpeg",
        media_type="image",
        uploader_id=superadmin_user.id,
    )
    session.add(media_file)
    await session.commit()
    await session.refresh(media_file)

    # 保存 ID 以避免 lazy load 问题
    media_id = media_file.id

    # 2. 创建 MDX 文件（只使用文件名）
    post_file = mock_content_dir / "post-cover-filename.mdx"
    post_file.write_text(
        f"""---
title: "Post with Cover Filename"
slug: "post-cover-filename"
author: "{superadmin_user.username}"
cover: "my-cover.jpg"
---

Content here.
""",
        encoding="utf-8",
    )

    # 3. 同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["added"]) == 1

    # 4. 验证封面图关联（通过文件名匹配）
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "post-cover-filename.mdx")
    result = await session.exec(stmt)
    post = result.one()
    await session.refresh(post)

    assert post.cover_media_id == media_id


@pytest.mark.asyncio
async def test_sync_without_cover(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    superadmin_user,
    session,
):
    """测试：MDX 文件不包含封面图"""
    # 创建 MDX 文件（无封面）
    post_file = mock_content_dir / "post-no-cover.mdx"
    post_file.write_text(
        f"""---
title: "Post without Cover"
slug: "post-no-cover"
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
    assert len(data["added"]) == 1

    # 验证封面为空
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "post-no-cover.mdx")
    result = await session.exec(stmt)
    post = result.one()

    assert post.cover_media_id is None
