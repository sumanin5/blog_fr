from pathlib import Path

import pytest
from app.core.config import settings


@pytest.fixture
def mock_content_dir(tmp_path, monkeypatch):
    """
    创建一个临时内容目录，并自动 Mock settings.CONTENT_DIR 指向它。
    """
    d = tmp_path / "content"
    d.mkdir()

    # 自动 Mock 配置
    monkeypatch.setattr(settings, "CONTENT_DIR", d)

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
        post_type=PostType.ARTICLE,
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
        post_type=PostType.ARTICLE,
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
