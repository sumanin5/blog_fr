import pytest
from app.core.config import settings
from app.posts.model import Post
from httpx import AsyncClient
from sqlmodel import select


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_sync_add_post(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    sample_git_post,
    git_commit_helper,
    session,
):
    """测试同步：Git 新增文件 → 数据库创建文章"""
    # Commit 文件到 Git
    git_commit_helper("Add post")

    # 执行同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true", headers=superadmin_user_token_headers
    )

    assert response.status_code == 200, f"Sync failed: {response.text}"
    data = response.json()

    # 验证响应：只导入文章，不再自动创建分类 index.md
    assert len(data["added"]) == 1
    assert any("git-post.mdx" in path for path in data["added"])
    assert len(data["updated"]) == 0
    assert len(data["deleted"]) == 0

    # 验证数据库是否创建了文章
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "git-post.mdx")
    result = await session.exec(stmt)
    post = result.one_or_none()

    assert post is not None
    assert post.title == "Git Sync Test"
    assert post.excerpt == "This is a summary from frontmatter"
    assert post.content_mdx.strip() == "# Hello Git\n\nThis is a test post from git."
    assert post.source_path == "git-post.mdx"
    assert post.slug == "git-sync-test"  # 显式 slug 必须保持不变


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_sync_update_post(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    sample_git_post,
    git_commit_helper,
    session,
    superadmin_user,
):
    """测试同步：Git 修改文件 → 数据库更新文章"""
    # 1. 先创建文章
    git_commit_helper("Add post")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200

    # 2. 修改 Git 文件
    sample_git_post.write_text(
        f"""---
title: "Git Sync Test Updated"
slug: "changed-url-must-not-apply"
published: true
author: "{superadmin_user.username}"
---

# Hello Git Updated
""",
        encoding="utf-8",
    )

    git_commit_helper("Update post")

    # 3. 再次同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()

    assert any("git-post.mdx" in path for path in data["updated"])

    # 4. 验证更新：标题变化，但已有 URL 不能被 frontmatter 的 slug 改掉
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "git-post.mdx")
    result = await session.exec(stmt)
    post = result.one()
    assert post.title == "Git Sync Test Updated"
    assert post.slug == "git-sync-test"


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_sync_delete_post(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    sample_git_post,
    git_commit_helper,
    session,
):
    """测试同步：Git 删除文件 → 数据库删除文章"""
    # 1. 先创建文章
    git_commit_helper("Add post")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200

    # 2. 删除 Git 文件并 commit
    sample_git_post.unlink()
    git_commit_helper("Delete post")

    # 3. 再次同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["deleted"]) == 1

    # 4. 验证删除
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "git-post.mdx")
    result = await session.exec(stmt)
    post = result.one_or_none()
    assert post is None
