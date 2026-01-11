from pathlib import Path

import pytest
from app.core.config import settings
from app.posts.model import Post
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_manual_sync_flow(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    sample_git_post: Path,  # 确保文件已创建
    session,
):
    """测试手动触发同步流程: Git -> DB"""

    # 1. 执行同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )

    assert response.status_code == 200, f"Sync failed: {response.text}"
    data = response.json()

    # 验证响应
    assert len(data["added"]) == 1
    assert "git-post.mdx" in data["added"][0]
    assert len(data["updated"]) == 0
    assert len(data["deleted"]) == 0

    # 2. 验证数据库是否创建了文章
    session.expire_all()
    from sqlmodel import select

    # 由于 slug 会自动添加后缀，使用 like 查询
    stmt = select(Post).where(Post.source_path == "git-post.mdx")
    result = await session.exec(stmt)
    post = result.one_or_none()

    assert post is not None
    assert post.title == "Git Sync Test"
    assert post.excerpt == "This is a summary from frontmatter"
    assert post.content_mdx.strip() == "# Hello Git\n\nThis is a test post from git."
    assert post.source_path == "git-post.mdx"
    assert post.slug.startswith("git-sync-test-")  # slug 会添加随机后缀

    # 3. 测试更新 (修改文件)
    # 直接修改 sample_git_post 文件的内容
    from app.users.model import User
    from sqlmodel import select as sql_select

    stmt = sql_select(User).where(User.role == "superadmin").limit(1)
    result = await session.exec(stmt)
    admin = result.first()

    sample_git_post.write_text(
        f"""---
title: "Git Sync Test Updated"
slug: "git-sync-test"
published: true
author: "{admin.username}"
---

# Hello Git Updated
""",
        encoding="utf-8",
    )

    # 再次同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["updated"]) == 1

    # 验证更新
    session.expire_all()  # 清除缓存
    stmt = select(Post).where(Post.source_path == "git-post.mdx")
    result = await session.exec(stmt)
    post = result.one()
    assert post.title == "Git Sync Test Updated"

    # 4. 测试删除 (删除文件)
    sample_git_post.unlink()

    # 再次同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["deleted"]) == 1

    # 验证删除
    session.expire_all()
    result = await session.exec(stmt)
    post = result.one_or_none()
    assert post is None
