from pathlib import Path

import pytest
from app.core.config import settings
from sqlalchemy import select

# Mark all tests as async
pytestmark = pytest.mark.asyncio


async def test_create_category_sync_dir(
    async_client, superadmin_user_token_headers, mock_content_dir: Path, session
):
    """
    Test Case 1: 创建分类时，物理目录可能被创建 (Lazy or Eager)。
    目前的实现是 Eager 初始化空目录。
    """
    category_slug = "new-tech-cat"
    post_type = "articles"

    # 1. API 调用创建分类
    response = await async_client.post(
        f"{settings.API_PREFIX}/posts/{post_type}/categories",
        json={"name": "New Tech Category", "slug": category_slug},
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["slug"] == category_slug

    # 2. 验证物理目录是否创建
    # 路径结构: CONTENT_DIR / article -> articles / new-tech-cat
    # 修复验证：物理路径应该是复数的 'articles'
    expected_dir = mock_content_dir / "articles" / category_slug
    assert expected_dir.exists(), (
        f"Physical directory {expected_dir} should be created (check plural mapping)!"
    )
    assert expected_dir.is_dir()


async def test_rename_category_slug_moves_files(
    async_client,
    superadmin_user_token_headers,
    mock_content_dir: Path,
    session,
    superadmin_user,  # Need user object for service call or just rely on API
):
    """
    Test Case 2: 重命名分类 Slug 时，物理目录被重命名，且关联文章的 source_path 更新。
    """
    # 0. 准备数据: 创建一个分类和一篇文章
    # 我们直接通过 API 创建，这样能复用完整的创建逻辑（包括物理文件生成）

    # 0.1 创建分类 'old-slug'
    old_slug = "old-slug"
    new_slug = "new-slug"
    post_type = "articles"

    resp_cat = await async_client.post(
        f"{settings.API_PREFIX}/posts/{post_type}/categories",
        json={"name": "Old Category", "slug": old_slug},
        headers=superadmin_user_token_headers,
    )
    assert resp_cat.status_code == 201
    category_id = resp_cat.json()["id"]

    # 0.2 创建在该分类下的文章
    # 文章会自动写入 CONTENT_DIR / article / old-slug / my-post.mdx
    resp_post = await async_client.post(
        f"{settings.API_PREFIX}/posts/{post_type}",
        json={
            "title": "My Post",
            "slug": "my-post",
            "category_id": category_id,
            "content_mdx": "# Hello",
            "post_type": post_type,
        },
        headers=superadmin_user_token_headers,
    )
    assert resp_post.status_code == 201
    post_id = resp_post.json()["id"]

    # 验证物理文件初始状态
    old_dir = mock_content_dir / "articles" / old_slug

    # 注意：path_calculator生成的可能是 article/old-slug/My-Post.mdx (My-Post 是 sanitized title)
    # 我们可以通过 API 返回的 source_path 来确定
    # 但由于 API response 可能不包含 source_path (如果 schema 排除了)，我们直接检查目录
    # 假设文件名是 sanitized title
    assert old_dir.exists()
    # 找到该目录下的文章文件(排除 index.md,它是分类元数据)
    files = [f for f in old_dir.glob("*.md*") if f.name != "index.md"]
    assert len(files) == 1, (
        f"Expected 1 post file, found {len(files)}: {[f.name for f in files]}"
    )
    post_file = files[0]

    # 1. 触发重命名 (PATCH Category)
    update_response = await async_client.patch(
        f"{settings.API_PREFIX}/posts/{post_type}/categories/{category_id}",
        json={"slug": new_slug, "name": "New Category Name"},
        headers=superadmin_user_token_headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["slug"] == new_slug

    # 2. 验证物理目录移动
    new_dir = mock_content_dir / "articles" / new_slug

    assert not old_dir.exists(), f"Old directory {old_dir} should be gone"
    assert new_dir.exists(), f"New directory {new_dir} should exist"

    # 3. 验证文件依然存在于新目录
    new_post_file = new_dir / post_file.name
    assert new_post_file.exists(), "Post file should be moved to new directory"

    # 4. 验证数据库中 Post 的 source_path 已更新
    # 这一步需要查询 DB
    from app.posts.model import Post

    result = await session.execute(select(Post).where(Post.id == post_id))
    db_post = result.scalar_one()

    # 预期路径: articles/new-slug/My-Post.mdx
    assert new_slug in db_post.source_path
    assert old_slug not in db_post.source_path
    assert db_post.source_path.startswith(f"articles/{new_slug}/")


async def test_delete_category_removes_empty_dir(
    async_client, superadmin_user_token_headers, mock_content_dir: Path
):
    """
    Test Case 3: 删除空分类时，物理目录被清理。
    """
    slug = "empty-cat-to-delete"
    post_type = "articles"

    # 1. 创建分类
    resp = await async_client.post(
        f"{settings.API_PREFIX}/posts/{post_type}/categories",
        json={"name": "Empty Cat", "slug": slug},
        headers=superadmin_user_token_headers,
    )
    category_id = resp.json()["id"]
    target_dir = mock_content_dir / "articles" / slug
    assert target_dir.exists()

    # 2. 删除分类
    del_resp = await async_client.delete(
        f"{settings.API_PREFIX}/posts/{post_type}/categories/{category_id}",
        headers=superadmin_user_token_headers,
    )
    assert del_resp.status_code == 204

    # 3. 验证物理目录被删除
    assert not target_dir.exists(), (
        "Empty directory should be removed after category deletion"
    )


async def test_delete_non_empty_category_skips_dir_removal(
    async_client, superadmin_user_token_headers, mock_content_dir: Path
):
    """
    Test Case 4: 删除非空分类时，保留物理目录以防数据丢失。
    """
    slug = "full-cat"
    post_type = "articles"

    # 1. 创建分类
    resp = await async_client.post(
        f"{settings.API_PREFIX}/posts/{post_type}/categories",
        json={"name": "Full Cat", "slug": slug},
        headers=superadmin_user_token_headers,
    )
    category_id = resp.json()["id"]
    target_dir = mock_content_dir / "articles" / slug

    # 2. 手动在里面塞一个文件（模拟残留文件）
    (target_dir / "ghost_file.txt").write_text("Boo")

    # 3. 删除分类
    del_resp = await async_client.delete(
        f"{settings.API_PREFIX}/posts/{post_type}/categories/{category_id}",
        headers=superadmin_user_token_headers,
    )
    assert del_resp.status_code == 204

    # 4. 验证物理目录依然存在
    assert target_dir.exists(), "Non-empty directory should NOT be removed"
    assert (target_dir / "ghost_file.txt").exists()
