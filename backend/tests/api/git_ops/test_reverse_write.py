"""后台文章 CRUD 只修改数据库，不创建、移动或删除内容仓库文件。"""

from pathlib import Path

import pytest
from app.core.config import settings


def snapshot(root: Path) -> dict[str, bytes]:
    return {
        p.relative_to(root).as_posix(): p.read_bytes()
        for p in root.rglob("*")
        if p.is_file() and ".git" not in p.relative_to(root).parts
    }


@pytest.mark.asyncio
async def test_admin_post_crud_never_writes_source_files(
    async_client,
    superadmin_user_token_headers,
    mock_content_dir,
):
    """创建、更新、删除文章都不应产生源文件副作用。"""
    before = snapshot(mock_content_dir)

    response = await async_client.post(
        f"{settings.API_PREFIX}/posts/articles",
        json={
            "title": "My New Post",
            "slug": "my-new-post",
            "content_mdx": "# Hello World\nThis is a test post.",
            "status": "published",
            "post_type": "articles",
        },
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 201
    created = response.json()
    assert created["source_path"] is None
    assert snapshot(mock_content_dir) == before

    post_id = created["id"]
    response = await async_client.patch(
        f"{settings.API_PREFIX}/posts/articles/{post_id}",
        json={"title": "New Title", "content_mdx": "Updated Content"},
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200
    assert snapshot(mock_content_dir) == before

    response = await async_client.delete(
        f"{settings.API_PREFIX}/posts/articles/{post_id}",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 204
    assert snapshot(mock_content_dir) == before


@pytest.mark.asyncio
async def test_admin_post_delete_does_not_remove_git_file(
    async_client,
    superadmin_user_token_headers,
    mock_content_dir,
    session,
    superadmin_user,
):
    """删除 Git 来源文章只删数据库记录，源文件必须保留。"""
    from app.posts.model import Post, PostStatus, PostType

    source = mock_content_dir / "articles" / "tech" / "git-post.md"
    source.parent.mkdir(parents=True)
    source.write_text(
        f"""---
title: "Git Post"
author: "{superadmin_user.username}"
status: published
---
Git body
""",
        encoding="utf-8",
    )

    post = Post(
        title="Git Post",
        slug="git-post",
        content_mdx="Git body",
        status=PostStatus.PUBLISHED,
        post_type=PostType.ARTICLES,
        author_id=superadmin_user.id,
        source_path="articles/tech/git-post.md",
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)

    response = await async_client.delete(
        f"{settings.API_PREFIX}/posts/articles/{post.id}",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 204
    assert source.exists()
    assert source.read_text(encoding="utf-8").startswith("---\ntitle: \"Git Post\"")
