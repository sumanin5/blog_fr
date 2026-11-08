"""旧版 /ops/git/push 必须明确拒绝，不能静默成功或写文件。"""

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
@pytest.mark.parametrize("with_db_only_post", [True, False])
async def test_push_endpoint_is_read_only(
    async_client,
    superadmin_user_token_headers,
    mock_content_dir,
    session,
    superadmin_user,
    with_db_only_post,
):
    """无论是否存在数据库独立文章，/push 都返回 409 且不产生文件。"""
    if with_db_only_post:
        from app.posts.model import Post, PostStatus, PostType

        post = Post(
            title="DB Only",
            slug="db-only",
            content_mdx="Body",
            status=PostStatus.PUBLISHED,
            post_type=PostType.ARTICLES,
            author_id=superadmin_user.id,
            source_path=None,
        )
        session.add(post)
        await session.commit()

    before = snapshot(mock_content_dir)
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/push",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 409
    body = response.json()
    assert body["error"]["code"] == "GITOPS_READ_ONLY"
    assert snapshot(mock_content_dir) == before
