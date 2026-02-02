"""
测试增量同步逻辑 - 基于 Git Diff 的增量更新

这个测试文件专注于验证 sync_incremental() 方法的核心功能:
1. 基于 Git commit hash 的增量检测
2. .gitops_last_sync 文件的读写
3. 只处理变更文件的逻辑
4. 无变更时的快速返回
5. 增量同步失败时回退到全量同步
"""

from pathlib import Path

import pytest
from app.core.config import settings
from app.posts.model import Post
from httpx import AsyncClient
from sqlmodel import select


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_incremental_sync_with_new_file(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    session,
    superadmin_user,
):
    """测试增量同步：新增文件"""
    # 1. 创建第一个文件并全量同步
    file1 = mock_content_dir / "post-1.mdx"
    file1.write_text(
        f"""---
title: "Post 1"
slug: "post-1"
author: "{superadmin_user.username}"
---

Content 1
""",
        encoding="utf-8",
    )
    git_commit_helper("Add post 1")

    # 执行全量同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["added"]) == 2  # 包含文章 + 自动创建的分类 index.md

    # 2. 创建第二个文件并 commit
    file2 = mock_content_dir / "post-2.mdx"
    file2.write_text(
        f"""---
title: "Post 2"
slug: "post-2"
author: "{superadmin_user.username}"
---

Content 2
""",
        encoding="utf-8",
    )
    git_commit_helper("Add post 2")

    # 3. 执行增量同步（不带 force_full 参数）
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()

    # 验证:只处理了新增的文件
    # 注意：第二次同步时，分类 index.md 已经存在，所以只添加新文章
    assert len(data["added"]) == 1
    assert any("post-2.mdx" in path for path in data["added"])
    # 注意:post-1.mdx 可能因为 frontmatter 写入而被标记为 updated
    # 这是预期行为,我们只需确保 post-2 被正确添加
    assert len(data["deleted"]) == 0

    # 验证数据库
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "post-2.mdx")
    result = await session.exec(stmt)
    post = result.one_or_none()
    assert post is not None
    assert post.title == "Post 2"


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_incremental_sync_with_modified_file(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    session,
    superadmin_user,
):
    """测试增量同步：修改已存在的文件"""
    # 1. 创建文件并全量同步
    test_file = mock_content_dir / "test-post.mdx"
    test_file.write_text(
        f"""---
title: "Original Title"
slug: "test-post"
author: "{superadmin_user.username}"
---

Original content
""",
        encoding="utf-8",
    )
    git_commit_helper("Add test post")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200

    # 2. 修改文件
    test_file.write_text(
        f"""---
title: "Updated Title"
slug: "test-post"
author: "{superadmin_user.username}"
---

Updated content
""",
        encoding="utf-8",
    )
    git_commit_helper("Update test post")

    # 3. 执行增量同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()

    # 验证：文件被标记为更新
    assert len(data["added"]) == 0
    assert len(data["updated"]) >= 1
    assert any("test-post.mdx" in path for path in data["updated"])
    assert len(data["deleted"]) == 0

    # 验证数据库更新
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "test-post.mdx")
    result = await session.exec(stmt)
    post = result.one()
    assert post.title == "Updated Title"
    assert "Updated content" in post.content_mdx


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_incremental_sync_with_deleted_file(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    session,
    superadmin_user,
):
    """测试增量同步：删除文件"""
    # 1. 创建文件并全量同步
    test_file = mock_content_dir / "to-delete.mdx"
    test_file.write_text(
        f"""---
title: "To Delete"
slug: "to-delete"
author: "{superadmin_user.username}"
---

Content
""",
        encoding="utf-8",
    )
    git_commit_helper("Add post to delete")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200

    # 2. 删除文件
    test_file.unlink()
    git_commit_helper("Delete post")

    # 3. 执行增量同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()

    # 验证：文件被标记为删除
    assert len(data["added"]) == 0
    assert len(data["deleted"]) == 1
    assert "to-delete.mdx" in data["deleted"][0]

    # 验证数据库删除
    session.expire_all()
    stmt = select(Post).where(Post.source_path == "to-delete.mdx")
    result = await session.exec(stmt)
    post = result.one_or_none()
    assert post is None


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_incremental_sync_no_changes(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    superadmin_user,
):
    """测试增量同步：无变更时快速返回"""
    # 1. 创建文件并全量同步
    test_file = mock_content_dir / "stable-post.mdx"
    test_file.write_text(
        f"""---
title: "Stable Post"
slug: "stable-post"
author: "{superadmin_user.username}"
---

Content
""",
        encoding="utf-8",
    )
    git_commit_helper("Add stable post")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200

    # 2. 不做任何修改，直接执行增量同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()

    # 验证：没有任何变更
    assert len(data["added"]) == 0
    assert len(data["updated"]) == 0
    assert len(data["deleted"]) == 0
    assert len(data["errors"]) == 0


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_incremental_sync_multiple_changes(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    session,
    superadmin_user,
):
    """测试增量同步：一次 commit 包含多个变更"""
    # 1. 创建初始文件
    file1 = mock_content_dir / "post-1.mdx"
    file1.write_text(
        f"""---
title: "Post 1"
slug: "post-1"
author: "{superadmin_user.username}"
---

Content 1
""",
        encoding="utf-8",
    )

    file2 = mock_content_dir / "post-2.mdx"
    file2.write_text(
        f"""---
title: "Post 2"
slug: "post-2"
author: "{superadmin_user.username}"
---

Content 2
""",
        encoding="utf-8",
    )
    git_commit_helper("Add initial posts")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200

    # 2. 一次性进行多个操作：新增、修改、删除
    file3 = mock_content_dir / "post-3.mdx"
    file3.write_text(
        f"""---
title: "Post 3"
slug: "post-3"
author: "{superadmin_user.username}"
---

Content 3
""",
        encoding="utf-8",
    )

    file1.write_text(
        f"""---
title: "Post 1 Updated"
slug: "post-1"
author: "{superadmin_user.username}"
---

Content 1 Updated
""",
        encoding="utf-8",
    )

    file2.unlink()

    git_commit_helper("Mixed changes: add post-3, update post-1, delete post-2")

    # 3. 执行增量同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()

    # 验证：所有变更都被正确处理
    # 注意：第二次同步时，分类 index.md 已经存在，所以只添加新文章
    assert len(data["added"]) == 1
    assert any("post-3.mdx" in path for path in data["added"])

    assert len(data["updated"]) >= 1
    assert any("post-1.mdx" in path for path in data["updated"])

    assert len(data["deleted"]) == 1
    assert "post-2.mdx" in data["deleted"][0]


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_incremental_sync_fail_on_no_hash(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    session,
    superadmin_user,
):
    """测试增量同步：没有 last_hash 时应该报错（不再自动回退）"""
    # 1. 创建文件但不执行全量同步（模拟首次同步）
    test_file = mock_content_dir / "first-post.mdx"
    test_file.write_text(
        f"""---
title: "First Post"
slug: "first-post"
author: "{superadmin_user.username}"
---

Content
""",
        encoding="utf-8",
    )
    git_commit_helper("Add first post")

    # 2. 确保没有 .gitops_last_sync 文件
    hash_file = mock_content_dir / ".gitops_last_sync"
    if hash_file.exists():
        hash_file.unlink()

    # 3. 执行增量同步（应该报错）
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )

    # 验证：应该返回错误（500 或 4xx，取决于异常处理配置，GitOpsConfigurationError 通常被映射为 500）
    assert response.status_code != 200

    # 验证错误信息包含提示
    # 注意：FastAPI 的 500 响应可能不包含 detail，或者包含 "Internal Server Error"
    # 这里我们主要验证它没有成功执行同步
    assert not hash_file.exists()  # 应该没有生成 hash 文件


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_incremental_sync_ignores_non_markdown_files(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    superadmin_user,
):
    """测试增量同步：忽略非 Markdown 文件的变更"""
    # 1. 创建 Markdown 文件并同步
    md_file = mock_content_dir / "test.mdx"
    md_file.write_text(
        f"""---
title: "Test"
slug: "test"
author: "{superadmin_user.username}"
---

Content
""",
        encoding="utf-8",
    )
    git_commit_helper("Add markdown file")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200

    # 2. 添加非 Markdown 文件
    txt_file = mock_content_dir / "readme.txt"
    txt_file.write_text("This is a text file")

    img_file = mock_content_dir / "image.png"
    img_file.write_bytes(b"\x89PNG\r\n\x1a\n")

    git_commit_helper("Add non-markdown files")

    # 3. 执行增量同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()

    # 验证：非 Markdown 文件被忽略
    # 注意：.gitops_last_sync 文件可能被检测为变更,但不会创建文章
    assert len(data["added"]) == 0
    # test.mdx 可能因为 frontmatter 写入而被标记为 updated
    assert len(data["deleted"]) == 0


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_hash_file_persistence(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    superadmin_user,
):
    """测试 .gitops_last_sync 文件的持久化"""
    # 1. 创建文件并全量同步
    test_file = mock_content_dir / "test.mdx"
    test_file.write_text(
        f"""---
title: "Test"
slug: "test"
author: "{superadmin_user.username}"
---

Content
""",
        encoding="utf-8",
    )
    git_commit_helper("Add test file")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200

    # 2. 验证 hash 文件存在且内容有效
    hash_file = mock_content_dir / ".gitops_last_sync"
    assert hash_file.exists()

    saved_hash = hash_file.read_text().strip()
    assert len(saved_hash) == 40  # Git SHA-1 hash 长度

    # 3. 修改文件并同步
    test_file.write_text(
        f"""---
title: "Test Updated"
slug: "test"
author: "{superadmin_user.username}"
---

Updated content
""",
        encoding="utf-8",
    )
    git_commit_helper("Update test file")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200

    # 4. 验证 hash 文件被更新
    new_hash = hash_file.read_text().strip()
    assert new_hash != saved_hash
    assert len(new_hash) == 40
