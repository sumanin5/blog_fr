from pathlib import Path

import pytest
from app.core.config import settings
from app.posts.model import Post
from httpx import AsyncClient
from sqlmodel import select


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_sync_internal_link_repair(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir,
    git_commit_helper,
    session,
    superadmin_user,
):
    """测试同步：自动修复内部 MD 链接"""

    # 确保用户属性已加载
    await session.refresh(superadmin_user)
    username = str(superadmin_user.username)

    # 1. 创建目标文章 B (posts/target.md)
    target_path = Path(mock_content_dir) / "posts" / "target.md"
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(
        f"""---
title: "Target Post"
slug: "target-slug"
published: true
author: "{username}"
---

Target content.
""",
        encoding="utf-8",
    )

    git_commit_helper("Add target post")

    # 执行同步同步 B
    await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )

    # 获取 B 的真实 Slug (数据库里可能有随机字符)
    stmt = select(Post).where(Post.source_path == "posts/target.md")
    result = await session.execute(stmt)
    target_post = result.scalar_one()
    real_slug = str(target_post.slug)

    # 2. 创建源文章 A (posts/source.md)，链接到 B
    source_path = Path(mock_content_dir) / "posts" / "source.md"
    source_path.write_text(
        f"""---
title: "Source Post"
slug: "source-slug"
published: true
author: "{username}"
---

Check out [this link](./target.md).
""",
        encoding="utf-8",
    )

    git_commit_helper("Add source post")

    # 3. 执行同步同步 A
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200

    # 4. 验证数据库中的 A 链接是否已修复
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "posts/source.md")
    result = await session.exec(stmt)
    source_post = result.one()

    expected_link = f"[this link](/posts/{real_slug})"
    assert expected_link in source_post.content_mdx

    # 5. 验证物理文件是否也被写回修复了
    file_content = source_path.read_text(encoding="utf-8")
    assert expected_link in file_content
    print(f"Verified link repair in file: {expected_link}")
