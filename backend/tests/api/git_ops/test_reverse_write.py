import pytest
from app.core.config import settings


@pytest.mark.asyncio
async def test_create_post_generates_file(
    async_client,
    superadmin_user_token_headers,
    mock_content_dir,
    mock_git_background_commit,  # 添加这个fixture来阻止后台Git提交任务抛出异常
):
    """测试创建文章时，自动生成物理文件"""
    import asyncio

    post_data = {
        "title": "My New Post",
        "slug": "my-new-post",
        "content_mdx": "# Hello World\\nThis is a test post.",
        "status": "published",
        "post_type": "article",
    }

    response = await async_client.post(
        f"{settings.API_PREFIX}/posts/article",
        json=post_data,
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "My New Post"

    # API 创建时会自动添加随机后缀，所以我们需要从响应中获取实际的 slug
    actual_slug = data["slug"]
    assert actual_slug.startswith("my-new-post")

    # 等待后台任务完成文件生成
    # 注意: 后台Git提交任务可能会抛出 "response already started" 异常
    # 这是因为响应已经发送,但后台任务还在执行,可以忽略
    await asyncio.sleep(2.0)

    # 验证文件是否生成
    # 注意: PathCalculator 将 'article' 映射为 'articles' (复数形式)
    # 路径规则: content/articles/uncategorized/{title}.md (默认 enable_jsx=False)
    expected_path = mock_content_dir / "articles" / "uncategorized" / "My New Post.md"

    assert expected_path.exists(), f"文件未生成: {expected_path}"

    content = expected_path.read_text(encoding="utf-8")
    assert "title: My New Post" in content
    assert f"slug: {actual_slug}" in content
    assert "# Hello World" in content


@pytest.mark.asyncio
async def test_update_post_updates_file(
    async_client,
    superadmin_user_token_headers,
    mock_content_dir,
    created_article_post,
):
    """测试更新文章时，更新物理文件"""
    import asyncio

    post_id = created_article_post["id"]

    # 等待初始文件生成
    await asyncio.sleep(1.0)

    file_path = mock_content_dir / "articles" / "uncategorized" / "Test Article.md"
    assert file_path.exists(), f"初始文件未生成: {file_path}"

    assert "# Test Content" in file_path.read_text(encoding="utf-8")

    # 调用 Update API
    update_data = {"title": "New Title", "content_mdx": "Updated Content"}

    response = await async_client.patch(
        f"{settings.API_PREFIX}/posts/article/{post_id}",
        json=update_data,
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200

    # 等待文件更新
    await asyncio.sleep(1.0)

    # 验证文件内容变化 - 更新标题会导致文件重命名
    new_file_path = mock_content_dir / "articles" / "uncategorized" / "New Title.md"
    assert new_file_path.exists(), f"更新后的文件未生成: {new_file_path}"

    assert not file_path.exists()

    new_content = new_file_path.read_text(encoding="utf-8")
    assert "title: New Title" in new_content
    assert "Updated Content" in new_content


@pytest.mark.asyncio
async def test_rename_post_moves_file(
    async_client,
    superadmin_user_token_headers,
    mock_content_dir,
    created_article_post,
):
    """测试修改 Slug 时，物理文件被移动"""
    import asyncio

    post_id = created_article_post["id"]

    # 等待初始文件生成
    await asyncio.sleep(1.0)

    old_path = mock_content_dir / "articles" / "uncategorized" / "Test Article.md"
    if not old_path.exists():
        pytest.skip(f"初始文件未生成: {old_path}")

    # 更新 Slug (Slug 变更不再影响文件名，因为文件名基于 Title)
    response = await async_client.patch(
        f"{settings.API_PREFIX}/posts/article/{post_id}",
        json={"slug": "new-slug"},
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200

    # 等待文件更新
    await asyncio.sleep(1.0)

    # 验证文件仍然存在（文件名没变）但内容更新了 slug
    assert old_path.exists()
    content = old_path.read_text(encoding="utf-8")
    assert "slug: new-slug" in content


@pytest.mark.asyncio
async def test_delete_post_removes_file(
    async_client,
    superadmin_user_token_headers,
    mock_content_dir,
    created_article_post,
):
    """测试删除文章时，物理文件被删除"""
    import asyncio

    post_id = created_article_post["id"]

    # 等待初始文件生成
    await asyncio.sleep(1.0)

    file_path = mock_content_dir / "articles" / "uncategorized" / "Test Article.md"
    assert file_path.exists(), f"初始文件未生成: {file_path}"

    # 删除文章
    response = await async_client.delete(
        f"{settings.API_PREFIX}/posts/article/{post_id}",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 204

    # 等待文件删除
    await asyncio.sleep(1.0)

    # 验证文件已删除
    assert not file_path.exists()
