from pathlib import Path

import pytest
from app.core.config import settings

# 定义一张图片
SMALL_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture
def mock_content_dir(tmp_path, monkeypatch, mocker):
    """
    创建一个临时内容目录，并自动 Mock settings.CONTENT_DIR 指向它。
    同时初始化该目录为 Git 仓库，防止 backend 出现 fatal: not a git repository 错误。
    """
    d = tmp_path / "content"
    d.mkdir()

    # 初始化 git
    import subprocess

    subprocess.run(["git", "init"], cwd=d, check=True)
    # 必要的配置，避免 commit 失败
    subprocess.run(
        ["git", "config", "user.email", "test@example.com"], cwd=d, check=True
    )
    subprocess.run(["git", "config", "user.name", "Test User"], cwd=d, check=True)
    subprocess.run(
        ["git", "commit", "--allow-empty", "-m", "Initial commit"], cwd=d, check=True
    )

    # 自动 Mock 配置（仍使用 monkeypatch，因为它更适合修改配置对象）
    monkeypatch.setattr(settings, "CONTENT_DIR", d)

    mocker.patch(
        "app.git_ops.git_client.GitClient.pull",
        return_value="Already up to date.",
    )
    mocker.patch(
        "app.git_ops.git_client.GitClient.push",
        return_value="",
    )

    return d


@pytest.fixture
def sample_git_post(mock_content_dir: Path, superadmin_user):
    """
    在 mock 的内容目录中创建一篇测试文章。
    """
    p = mock_content_dir / "git-post.mdx"
    p.write_text(
        f"""---
title: "Git Sync Test"
slug: "git-sync-test"
published: true
tags: ["git", "test"]
summary: "This is a summary from frontmatter"
author: "{superadmin_user.username}"
---

# Hello Git

This is a test post from git.
""",
        encoding="utf-8",
    )
    return p


@pytest.fixture
async def resync_test_post(mock_content_dir: Path, session, superadmin_user):
    """
    创建用于 resync 测试的文章和文件。

    Returns:
        tuple: (post, test_file_path, new_author)
    """
    from app.posts.model import Category, Post, PostStatus, PostType
    from app.users.model import User, UserRole

    # 创建原作者
    author = User(
        username="original_author",
        email="original@example.com",
        hashed_password="hashed",
        role=UserRole.USER,
    )
    session.add(author)

    # 创建新作者
    new_author = User(
        username="new_author",
        email="new@example.com",
        hashed_password="hashed",
        role=UserRole.USER,
    )
    session.add(new_author)

    # 创建测试分类
    category = Category(
        name="Tech",
        slug="tech",
        post_type=PostType.ARTICLES,
    )
    session.add(category)

    await session.commit()
    await session.refresh(author)
    await session.refresh(new_author)
    await session.refresh(category)

    # 创建测试文章
    post = Post(
        title="Test Post",
        slug="test-post-resync",
        content_mdx="# Test",
        status=PostStatus.PUBLISHED,
        post_type=PostType.ARTICLES,
        author_id=author.id,
        category_id=category.id,
        source_path="test-resync.mdx",
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)

    # 创建测试文件（修改了 author 名字，不包含 author_id）
    test_file = mock_content_dir / "test-resync.mdx"
    test_file.write_text(
        """---
title: "Test Post"
author: "new_author"
category: "tech"
---

# Test Content
""",
        encoding="utf-8",
    )

    return post, test_file, new_author


@pytest.fixture
def mock_media_root(tmp_path, monkeypatch):
    """Mock MEDIA_ROOT 为临时目录"""
    d = tmp_path / "media"
    d.mkdir()
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(d))
    return d


@pytest.fixture
async def resync_base_setup(mock_content_dir: Path, session):
    """为 resync 测试提供基础环境：用户、分类、文章目录

    Returns:
        dict: {
            'user': User,
            'tech_category': Category,
            'life_category': Category,
            'articles_dir': Path
        }
    """
    from app.posts.model import Category, PostType
    from app.users.model import User, UserRole

    # 创建测试用户
    user = User(
        username="test_user",
        email="test@example.com",
        hashed_password="hashed",
        role=UserRole.USER,
    )
    session.add(user)

    # 创建测试分类
    tech_category = Category(name="Tech", slug="tech", post_type=PostType.ARTICLES)
    life_category = Category(name="Life", slug="life", post_type=PostType.ARTICLES)
    session.add_all([tech_category, life_category])

    await session.commit()
    await session.refresh(user)
    await session.refresh(tech_category)
    await session.refresh(life_category)

    # 创建文章目录
    articles_dir = mock_content_dir / "Articles" / "Tech"
    articles_dir.mkdir(parents=True, exist_ok=True)

    return {
        "user": user,
        "tech_category": tech_category,
        "life_category": life_category,
        "articles_dir": articles_dir,
    }


# 1x1 transparent pixel PNG
@pytest.fixture
def mock_png():
    """A mock 1x1 transparent pixel PNG image."""
    return SMALL_PNG


@pytest.fixture
def mock_git_background_commit(mocker):
    """Mock run_background_commit 防止真实的 Git 提交"""
    return mocker.patch("app.posts.routers.posts.editor.run_background_commit")


@pytest.fixture
async def created_article_post(
    async_client, superadmin_user_token_headers, mock_git_background_commit
):
    """创建一篇测试文章并返回响应数据

    Returns:
        dict: API 响应的文章数据，包含 id, slug, title 等
    """
    response = await async_client.post(
        f"{settings.API_PREFIX}/posts/articles",
        json={
            "title": "Test Article",
            "slug": "test-article",
            "content_mdx": "# Test Content",
            "status": "draft",
            "post_type": "articles",
        },
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def git_commit_helper(mock_content_dir):
    """提供 Git commit 辅助函数"""
    import subprocess

    def commit(message: str = "Test commit"):
        subprocess.run(["git", "add", "."], cwd=mock_content_dir, check=True)
        subprocess.run(
            ["git", "commit", "-m", message], cwd=mock_content_dir, check=True
        )

    return commit
