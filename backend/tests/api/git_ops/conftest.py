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
def sample_git_post(mock_content_dir: Path):
    """
    在 mock 的内容目录中创建一篇测试文章。
    """
    p = mock_content_dir / "git-post.mdx"
    p.write_text(
        """---
title: "Git Sync Test"
slug: "git-sync-test"
published: true
tags: ["git", "test"]
summary: "This is a summary from frontmatter"
---

# Hello Git

This is a test post from git.
""",
        encoding="utf-8",
    )
    return p
