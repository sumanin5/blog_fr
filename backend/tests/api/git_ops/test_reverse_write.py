from unittest.mock import patch

import pytest
from app.core.config import settings


# 模拟一个 Git 仓库环境
@pytest.fixture
def mock_git_content_dir(tmp_path, monkeypatch):
    """
    创建一个临时的 Content 目录，并初始化为 Git 仓库，
    以支持 GitClient 的正常运行（虽然我们可能会 Mock 掉 push）
    """
    content_dir = tmp_path / "content"
    content_dir.mkdir()

    # 初始化 git (为了让 GitClient 不报错，虽然实际操作中可能 mock 掉 run)
    import subprocess

    subprocess.run(["git", "init"], cwd=content_dir, check=True)
    # 配置 user email/name 以便 commit 能成功
    subprocess.run(
        ["git", "config", "user.email", "test@example.com"], cwd=content_dir, check=True
    )
    subprocess.run(
        ["git", "config", "user.name", "Test User"], cwd=content_dir, check=True
    )

    # 替换 settings.CONTENT_DIR
    monkeypatch.setattr(settings, "CONTENT_DIR", str(content_dir))
    return content_dir


@pytest.mark.asyncio
async def test_create_post_generates_file(
    async_client, superadmin_user_token_headers, mock_git_content_dir, session
):
    """测试创建文章时，自动生成物理文件"""

    # 模拟 run_background_commit，因为我们不想真的 push 到远程，也想验证它被调用了
    with patch("app.posts.router.run_background_commit") as mock_bg_commit:
        post_data = {
            "title": "My New Post",
            "slug": "my-new-post",
            "content_mdx": "# Hello World\nThis is a test post.",
            "status": "published",
            "post_type": "article",
        }

        response = await async_client.post(
            "/api/v1/posts/article",
            json=post_data,
            headers=superadmin_user_token_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "My New Post"

        # API 创建时会自动添加随机后缀，所以我们需要从响应中获取实际的 slug
        actual_slug = data["slug"]
        assert actual_slug.startswith("my-new-post")

        # 验证文件是否生成
        # 路径规则: content/article/uncategorized/{title}.md (默认 enable_jsx=False)
        # 注意：PathCalculator 使用 title 作为文件名，且扩展名默认为 md
        expected_path = (
            mock_git_content_dir / "article" / "uncategorized" / "My New Post.md"
        )
        assert expected_path.exists()

        content = expected_path.read_text(encoding="utf-8")
        assert "title: My New Post" in content
        assert f"slug: {actual_slug}" in content
        assert "# Hello World" in content

        # 验证是否触发了后台 Git 提交任务
        # FastAPI TestClient 会自动执行 BackgroundTasks，所以 mock 应该被调用
        mock_bg_commit.assert_called_once()
        assert "Create post" in mock_bg_commit.call_args[0][0]


@pytest.mark.asyncio
async def test_update_post_updates_file(
    async_client, superadmin_user_token_headers, mock_git_content_dir, session
):
    """测试更新文章时，更新物理文件"""

    # 1. 先创建文章 (通过 API 或直接 DB + Writer)
    # 为了简化，直接走 API 创建，复用上面的逻辑
    response = await async_client.post(
        "/api/v1/posts/article",
        json={
            "title": "Old Title",
            "slug": "update-test",
            "content_mdx": "Original Content",
            "status": "draft",
            "post_type": "article",
        },
        headers=superadmin_user_token_headers,
    )

    data = response.json()
    post_id = data["id"]
    actual_slug = data["slug"]

    file_path = mock_git_content_dir / "article" / "uncategorized" / "Old Title.md"
    assert "Original Content" in file_path.read_text(encoding="utf-8")

    # 2. 调用 Update API
    with patch("app.posts.router.run_background_commit") as mock_bg_commit:
        update_data = {"title": "New Title", "content_mdx": "Updated Content"}

        response = await async_client.patch(
            f"/api/v1/posts/article/{post_id}",
            json=update_data,
            headers=superadmin_user_token_headers,
        )
        assert response.status_code == 200

        # 3. 验证文件内容变化
        # 更新标题会导致文件重命名
        new_file_path = (
            mock_git_content_dir / "article" / "uncategorized" / "New Title.md"
        )
        assert new_file_path.exists()
        assert not file_path.exists()

        new_content = new_file_path.read_text(encoding="utf-8")
        assert "title: New Title" in new_content
        assert "Updated Content" in new_content

        mock_bg_commit.assert_called_once()


@pytest.mark.asyncio
async def test_rename_post_moves_file(
    async_client, superadmin_user_token_headers, mock_git_content_dir, session
):
    """测试修改 Slug 时，物理文件被移动"""

    # 1. 创建文章
    response = await async_client.post(
        "/api/v1/posts/article",
        json={
            "title": "Move Test",
            "slug": "old-slug",
            "content_mdx": "Content",
            "post_type": "article",
        },
        headers=superadmin_user_token_headers,
    )
    data = response.json()
    post_id = data["id"]
    actual_first_slug = data["slug"]

    old_path = mock_git_content_dir / "article" / "uncategorized" / "Move Test.md"
    assert old_path.exists()

    # 2. 更新 Slug (Slug 变更不再影响文件名，因为文件名基于 Title)
    with patch("app.posts.router.run_background_commit") as mock_bg_commit:
        response = await async_client.patch(
            f"/api/v1/posts/article/{post_id}",
            json={"slug": "new-slug"},
            headers=superadmin_user_token_headers,
        )
        assert response.status_code == 200

        # 验证文件仍然存在（文件名没变）但内容更新了 slug
        assert old_path.exists()
        content = old_path.read_text(encoding="utf-8")
        assert "slug: new-slug" in content


@pytest.mark.asyncio
async def test_delete_post_removes_file(
    async_client, superadmin_user_token_headers, mock_git_content_dir, session
):
    """测试删除文章时，物理文件被删除"""

    # 1. 创建文章
    response = await async_client.post(
        "/api/v1/posts/article",
        json={
            "title": "Delete Test",
            "slug": "to-delete",
            "content_mdx": "Content",
            "post_type": "article",
        },
        headers=superadmin_user_token_headers,
    )
    data = response.json()
    post_id = data["id"]
    actual_slug = data["slug"]

    file_path = mock_git_content_dir / "article" / "uncategorized" / "Delete Test.md"
    assert file_path.exists()

    # 2. 删除文章
    with patch("app.posts.router.run_background_commit") as mock_bg_commit:
        response = await async_client.delete(
            f"/api/v1/posts/article/{post_id}", headers=superadmin_user_token_headers
        )
        assert response.status_code == 204

        # 3. 验证文件已删除
        assert not file_path.exists()
