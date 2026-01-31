"""
测试导出服务 (Export Service)

验证从数据库导出文章到文件系统的功能，
包括路径计算、文件写入以及 source_path 更新。
"""

import pytest
from app.core.config import settings
from app.posts.model import Category, Post, PostStatus, PostType
from httpx import AsyncClient


@pytest.fixture(autouse=True)
def mock_git_push(mocker):
    """自动 Mock Git push 操作，避免测试环境中的远程仓库问题"""
    return mocker.patch(
        "app.git_ops.git_client.GitClient.push", return_value="Mocked push"
    )


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_export_native_post_to_git(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir,
    session,
    superadmin_user,
):
    """测试：将仅存在于数据库的文章导出为 MDX 文件"""
    # 1. 创建一个分类
    category = Category(
        name="Tech",
        slug="tech",
        post_type=PostType.ARTICLES,
    )
    session.add(category)
    await session.commit()
    await session.refresh(category)

    # 2. 创建一篇仅存在于数据库的文章（source_path 为 None）
    post = Post(
        title="Native Database Post",
        slug="native-db-post",
        content_mdx="# Hello from Database\n\nThis post was created in the CMS.",
        status=PostStatus.PUBLISHED,
        post_type=PostType.ARTICLES,
        author_id=superadmin_user.id,
        category_id=category.id,
        source_path=None,  # 关键：没有 source_path
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)

    # 3. 调用导出 API
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/push",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200, f"Export failed: {response.text}"
    data = response.json()

    # 4. 验证响应
    assert len(data["updated"]) == 1
    assert "articles/tech/" in data["updated"][0]
    assert "Native Database Post" in data["updated"][0]

    # 5. 验证数据库中的 source_path 已更新
    await session.refresh(post)
    assert post.source_path is not None
    assert "articles/tech/" in post.source_path
    assert post.source_path.endswith(".md")

    # 6. 验证文件确实被写入了
    exported_file = mock_content_dir / post.source_path
    assert exported_file.exists()
    content = exported_file.read_text(encoding="utf-8")
    assert "Native Database Post" in content
    assert "Hello from Database" in content


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_export_skips_posts_with_source_path(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir,
    session,
    superadmin_user,
):
    """测试：已有 source_path 且文件存在的文章不会被重复导出"""
    # 创建一篇已经有 source_path 的文章
    category = Category(
        name="Tech",
        slug="tech",
        post_type=PostType.ARTICLES,
    )
    session.add(category)
    await session.commit()
    await session.refresh(category)

    # 创建实际的文件
    source_path = "articles/tech/existing-post.md"
    file_path = mock_content_dir / source_path
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(
        """---
title: "Git Managed Post"
slug: "git-managed-post"
---

# From Git
""",
        encoding="utf-8",
    )

    post = Post(
        title="Git Managed Post",
        slug="git-managed-post",
        content_mdx="# From Git",
        status=PostStatus.PUBLISHED,
        post_type=PostType.ARTICLES,
        author_id=superadmin_user.id,
        category_id=category.id,
        source_path=source_path,  # 已有路径且文件存在
    )
    session.add(post)
    await session.commit()

    # 调用导出 API
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/push",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200
    data = response.json()

    # 验证：没有文章被导出（因为文件已存在）
    assert len(data["updated"]) == 0


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_export_with_tags(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir,
    session,
    superadmin_user,
):
    """测试：导出带标签的文章"""
    from app.posts.model import Tag

    # 创建分类和标签
    category = Category(
        name="Tech",
        slug="tech",
        post_type=PostType.ARTICLES,
    )
    tag1 = Tag(name="Python", slug="python")
    tag2 = Tag(name="FastAPI", slug="fastapi")
    session.add_all([category, tag1, tag2])
    await session.commit()
    await session.refresh(category)
    await session.refresh(tag1)
    await session.refresh(tag2)

    # 创建带标签的文章
    post = Post(
        title="Tagged Post",
        slug="tagged-post",
        content_mdx="# Tagged Content",
        status=PostStatus.PUBLISHED,
        post_type=PostType.ARTICLES,
        author_id=superadmin_user.id,
        category_id=category.id,
        source_path=None,
    )
    post.tags = [tag1, tag2]
    session.add(post)
    await session.commit()
    await session.refresh(post)

    # 导出
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/push",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["updated"]) == 1

    # 验证导出的文件包含标签
    await session.refresh(post)
    exported_file = mock_content_dir / post.source_path
    content = exported_file.read_text(encoding="utf-8")
    assert "Python" in content
    assert "FastAPI" in content


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_export_mdx_extension_for_jsx_enabled(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir,
    session,
    superadmin_user,
):
    """测试：启用 JSX 的文章导出为 .mdx 文件"""
    category = Category(
        name="Tech",
        slug="tech",
        post_type=PostType.ARTICLES,
    )
    session.add(category)
    await session.commit()
    await session.refresh(category)

    # 创建启用 JSX 的文章
    post = Post(
        title="Interactive Post",
        slug="interactive-post",
        content_mdx="# Interactive\n\n<CustomComponent />",
        status=PostStatus.PUBLISHED,
        post_type=PostType.ARTICLES,
        author_id=superadmin_user.id,
        category_id=category.id,
        enable_jsx=True,  # 启用 JSX
        source_path=None,
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)

    # 导出
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/push",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200

    # 验证文件扩展名为 .mdx
    await session.refresh(post)
    assert post.source_path.endswith(".mdx")

    exported_file = mock_content_dir / post.source_path
    assert exported_file.exists()
