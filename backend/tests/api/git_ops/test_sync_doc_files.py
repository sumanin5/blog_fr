"""
测试内容仓库说明文档（README.md / AGENTS.md 等）不会被同步为文章

全量同步 (scan_all) 与增量同步 (webhook 触发的 git diff) 必须使用同一套过滤规则。
"""

from pathlib import Path

import pytest
from app.core.config import settings
from app.git_ops.components.scanner import is_content_file
from app.posts.model import Post
from httpx import AsyncClient
from sqlmodel import select

DOC_FILES = [
    "README.md",
    "AGENTS.md",
    "CLAUDE.md",
    "articles/README.md",
    "articles/python/readme.md",
]


@pytest.mark.git_ops
@pytest.mark.parametrize(
    "rel_path, expected",
    [
        ("articles/python/post.md", True),
        ("articles/python/post.mdx", True),
        ("post.mdx", True),
        ("README.md", False),
        ("AGENTS.md", False),
        ("articles/python/Readme.MDX", False),
        ("CHANGELOG.md", False),
        (".demo/post.md", False),
        ("articles/.drafts/post.md", False),
        ("articles/python/cover.png", False),
    ],
)
def test_is_content_file(rel_path: str, expected: bool):
    assert is_content_file(rel_path) is expected


def _write_docs(content_dir: Path) -> None:
    for rel in DOC_FILES:
        path = content_dir / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("# 内容仓库说明\n\n这不是一篇文章。\n", encoding="utf-8")


def _write_post(content_dir: Path, username: str) -> None:
    post = content_dir / "articles" / "python" / "real-post.md"
    post.parent.mkdir(parents=True, exist_ok=True)
    post.write_text(
        f"""---
title: "Real Post"
slug: "real-post"
author: "{username}"
---

Real content
""",
        encoding="utf-8",
    )


async def _source_paths(session) -> set[str]:
    session.expire_all()
    result = await session.exec(select(Post.source_path))
    return set(result.all())


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_full_sync_skips_doc_files(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    session,
    superadmin_user,
):
    """全量同步：说明文档不导入，正常文章照常导入"""
    _write_docs(mock_content_dir)
    _write_post(mock_content_dir, superadmin_user.username)
    git_commit_helper("Add docs and post")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200
    # 说明文档不应被当作文章处理（否则会报缺少 author 等同步错误）
    assert response.json()["errors"] == []

    paths = await _source_paths(session)
    assert "articles/python/real-post.md" in paths
    assert paths.isdisjoint(DOC_FILES)


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_incremental_sync_skips_doc_files(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    session,
    superadmin_user,
):
    """增量同步：新提交的说明文档不导入"""
    _write_post(mock_content_dir, superadmin_user.username)
    git_commit_helper("Add post")
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200

    _write_docs(mock_content_dir)
    git_commit_helper("Add repository docs")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["errors"] == []
    assert not any(path in DOC_FILES for path in data["added"])

    paths = await _source_paths(session)
    assert paths.isdisjoint(DOC_FILES)


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_incremental_sync_rename_to_doc_deletes_post(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    session,
    superadmin_user,
):
    """增量同步：文章被改名为 README.md 时，按删除原文章处理"""
    _write_post(mock_content_dir, superadmin_user.username)
    git_commit_helper("Add post")
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200
    assert "articles/python/real-post.md" in await _source_paths(session)

    src = mock_content_dir / "articles" / "python" / "real-post.md"
    src.rename(src.with_name("README.md"))
    git_commit_helper("Turn post into README")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200

    paths = await _source_paths(session)
    assert "articles/python/real-post.md" not in paths
    assert "articles/python/README.md" not in paths
