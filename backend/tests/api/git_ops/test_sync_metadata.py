"""
测试 Git 同步的元数据字段功能
"""

from pathlib import Path

import pytest
from app.core.config import settings
from app.posts.model import Post, PostType
from httpx import AsyncClient
from sqlmodel import select


@pytest.mark.asyncio
async def test_sync_with_tags(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    superadmin_user,
    session,
):
    """测试：MDX 文件包含标签"""
    # 创建文件（包含多个标签）
    post_file = mock_content_dir / "post-with-tags.mdx"
    post_file.write_text(
        f"""---
title: "Post with Tags"
slug: "post-with-tags"
author: "{superadmin_user.username}"
tags:
  - Python
  - FastAPI
  - Testing
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

    # 验证标签
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "post-with-tags.mdx")
    result = await session.exec(stmt)
    post = result.one()
    await session.refresh(post, attribute_names=["tags"])

    assert len(post.tags) == 3
    tag_names = {tag.name for tag in post.tags}
    assert tag_names == {"Python", "FastAPI", "Testing"}


@pytest.mark.asyncio
async def test_sync_with_comma_separated_tags(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    superadmin_user,
    session,
):
    """测试：MDX 文件使用逗号分隔的标签字符串"""
    # 创建文件（逗号分隔的标签）
    post_file = mock_content_dir / "post-comma-tags.mdx"
    post_file.write_text(
        f"""---
title: "Post with Comma Tags"
slug: "post-comma-tags"
author: "{superadmin_user.username}"
tags: "React, TypeScript, Next.js"
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

    # 验证标签
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "post-comma-tags.mdx")
    result = await session.exec(stmt)
    post = result.one()
    await session.refresh(post, attribute_names=["tags"])

    assert len(post.tags) == 3
    tag_names = {tag.name for tag in post.tags}
    assert tag_names == {"React", "TypeScript", "Next.js"}


@pytest.mark.asyncio
async def test_sync_with_seo_metadata(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    superadmin_user,
    session,
):
    """测试：MDX 文件包含 SEO 元数据"""
    # 创建文件（包含 SEO 字段）
    post_file = mock_content_dir / "post-with-seo.mdx"
    post_file.write_text(
        f"""---
title: "Post with SEO"
slug: "post-with-seo"
author: "{superadmin_user.username}"
meta_title: "Custom SEO Title"
meta_description: "This is a custom SEO description for search engines"
meta_keywords: "SEO, metadata, optimization"
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

    # 验证 SEO 字段
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "post-with-seo.mdx")
    result = await session.exec(stmt)
    post = result.one()

    assert post.meta_title == "Custom SEO Title"
    assert (
        post.meta_description == "This is a custom SEO description for search engines"
    )
    assert post.meta_keywords == "SEO, metadata, optimization"


@pytest.mark.asyncio
async def test_sync_with_post_type(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    superadmin_user,
    session,
):
    """测试：MDX 文件指定文章类型"""
    # 创建文件（指定为 IDEA 类型）
    post_file = mock_content_dir / "idea-post.mdx"
    post_file.write_text(
        f"""---
title: "Idea Post"
slug: "idea-post"
author: "{superadmin_user.username}"
type: "IDEAS"
---

This is an idea post.
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

    # 验证文章类型
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "idea-post.mdx")
    result = await session.exec(stmt)
    post = result.one()

    assert post.post_type == PostType.IDEAS


@pytest.mark.asyncio
async def test_sync_with_featured_flag(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    superadmin_user,
    session,
):
    """测试：MDX 文件标记为推荐"""
    # 创建文件（标记为推荐）
    post_file = mock_content_dir / "featured-post.mdx"
    post_file.write_text(
        f"""---
title: "Featured Post"
slug: "featured-post"
author: "{superadmin_user.username}"
is_featured: true
allow_comments: false
---

This is a featured post.
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

    # 验证标志
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "featured-post.mdx")
    result = await session.exec(stmt)
    post = result.one()

    assert post.is_featured is True
    assert post.allow_comments is False


@pytest.mark.asyncio
async def test_sync_with_all_metadata(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    superadmin_user,
    session,
):
    """测试：MDX 文件包含所有元数据"""
    # 创建文件（包含所有字段）
    post_file = mock_content_dir / "complete-post.mdx"
    post_file.write_text(
        f"""---
title: "Complete Post"
slug: "complete-post"
author: "{superadmin_user.username}"
type: "ARTICLES"
status: "PUBLISHED"
date: "2024-01-15"
excerpt: "This is a custom excerpt"
tags:
  - Complete
  - Metadata
is_featured: true
allow_comments: true
meta_title: "Complete Post SEO Title"
meta_description: "Complete post SEO description"
meta_keywords: "complete, metadata, test"
---

Complete post content.
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

    # 验证所有字段
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "complete-post.mdx")
    result = await session.exec(stmt)
    post = result.one()
    await session.refresh(post, attribute_names=["tags"])

    assert post.title == "Complete Post"
    assert post.post_type == PostType.ARTICLES
    assert post.excerpt == "This is a custom excerpt"
    assert post.is_featured is True
    assert post.allow_comments is True
    assert post.meta_title == "Complete Post SEO Title"
    assert post.meta_description == "Complete post SEO description"
    assert post.meta_keywords == "complete, metadata, test"
    assert len(post.tags) == 2
