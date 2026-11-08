"""后台分类 CRUD 只修改数据库，不创建、移动或删除 Git 目录和 index.md。"""

from pathlib import Path

import pytest
from app.core.config import settings
from app.posts.model import Category
from sqlalchemy import select

pytestmark = pytest.mark.asyncio


def snapshot(root: Path) -> dict[str, bytes]:
    return {
        p.relative_to(root).as_posix(): p.read_bytes()
        for p in root.rglob("*")
        if p.is_file() and ".git" not in p.relative_to(root).parts
    }


async def test_create_category_does_not_create_directory(
    async_client, superadmin_user_token_headers, mock_content_dir: Path, session
):
    before = snapshot(mock_content_dir)

    response = await async_client.post(
        f"{settings.API_PREFIX}/posts/articles/categories",
        json={"name": "New Tech Category", "slug": "new-tech-cat"},
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 201
    assert response.json()["slug"] == "new-tech-cat"
    assert snapshot(mock_content_dir) == before
    assert not (mock_content_dir / "articles" / "new-tech-cat").exists()

    session.expire_all()
    category = (
        await session.execute(
            select(Category).where(Category.slug == "new-tech-cat")
        )
    ).scalar_one()
    assert category.name == "New Tech Category"


async def test_rename_category_does_not_move_source(
    async_client, superadmin_user_token_headers, mock_content_dir: Path, session
):
    old_slug = "old-slug"
    new_slug = "new-slug"

    resp_cat = await async_client.post(
        f"{settings.API_PREFIX}/posts/articles/categories",
        json={"name": "Old Category", "slug": old_slug},
        headers=superadmin_user_token_headers,
    )
    assert resp_cat.status_code == 201
    category_id = resp_cat.json()["id"]

    # 模拟 Git 中已经存在的分类目录和 index.md；后台改名不能移动它们。
    old_dir = mock_content_dir / "articles" / old_slug
    old_dir.mkdir(parents=True)
    index = old_dir / "index.md"
    index.write_text(
        "---\ntitle: Old Category\n---\nGit category\n", encoding="utf-8"
    )
    before = snapshot(mock_content_dir)

    update_response = await async_client.patch(
        f"{settings.API_PREFIX}/posts/articles/categories/{category_id}",
        json={"slug": new_slug, "name": "New Category Name"},
        headers=superadmin_user_token_headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["slug"] == new_slug

    assert snapshot(mock_content_dir) == before
    assert old_dir.exists()
    assert index.exists()
    assert not (mock_content_dir / "articles" / new_slug).exists()

    session.expire_all()
    category = await session.get(Category, category_id)
    assert category.slug == new_slug
    assert category.name == "New Category Name"


async def test_delete_category_does_not_remove_directory(
    async_client, superadmin_user_token_headers, mock_content_dir: Path, session
):
    slug = "empty-cat-to-delete"

    resp = await async_client.post(
        f"{settings.API_PREFIX}/posts/articles/categories",
        json={"name": "Empty Cat", "slug": slug},
        headers=superadmin_user_token_headers,
    )
    assert resp.status_code == 201
    category_id = resp.json()["id"]

    target_dir = mock_content_dir / "articles" / slug
    target_dir.mkdir(parents=True)
    index = target_dir / "index.md"
    index.write_text("---\ntitle: Empty Cat\n---\n", encoding="utf-8")
    before = snapshot(mock_content_dir)

    del_resp = await async_client.delete(
        f"{settings.API_PREFIX}/posts/articles/categories/{category_id}",
        headers=superadmin_user_token_headers,
    )
    assert del_resp.status_code == 204

    assert snapshot(mock_content_dir) == before
    assert target_dir.exists()
    assert index.exists()

    session.expire_all()
    assert await session.get(Category, category_id) is None


async def test_delete_non_empty_category_keeps_directory(
    async_client, superadmin_user_token_headers, mock_content_dir: Path, session
):
    slug = "full-cat"

    resp = await async_client.post(
        f"{settings.API_PREFIX}/posts/articles/categories",
        json={"name": "Full Cat", "slug": slug},
        headers=superadmin_user_token_headers,
    )
    assert resp.status_code == 201
    category_id = resp.json()["id"]

    target_dir = mock_content_dir / "articles" / slug
    target_dir.mkdir(parents=True)
    ghost = target_dir / "ghost_file.txt"
    ghost.write_text("Boo", encoding="utf-8")
    before = snapshot(mock_content_dir)

    del_resp = await async_client.delete(
        f"{settings.API_PREFIX}/posts/articles/categories/{category_id}",
        headers=superadmin_user_token_headers,
    )
    assert del_resp.status_code == 204

    assert snapshot(mock_content_dir) == before
    assert target_dir.exists()
    assert ghost.exists()
