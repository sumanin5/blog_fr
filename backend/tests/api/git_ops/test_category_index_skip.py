"""
测试分类索引文件跳过逻辑

验证在 Git 同步预览时，分类的 index.md 文件不会被当作普通文章处理，
从而避免"缺少 author 字段"的误报错误。
"""

import pytest
from app.core.config import settings
from httpx import AsyncClient


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_preview_skips_category_index_files(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir,
    git_commit_helper,
):
    """测试：预览时应跳过分类的 index.md 文件"""
    # 1. 创建分类目录和 index.md
    category_dir = mock_content_dir / "articles" / "tech"
    category_dir.mkdir(parents=True, exist_ok=True)

    category_index = category_dir / "index.md"
    category_index.write_text(
        """---
title: "Tech Category"
hidden: false
icon: "code"
---

This is the tech category description.
""",
        encoding="utf-8",
    )

    git_commit_helper("Add category index")

    # 2. 调用预览 API
    response = await async_client.get(
        f"{settings.API_PREFIX}/ops/git/preview",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200
    data = response.json()

    # 3. 验证：分类 index.md 不应出现在待创建列表中
    assert len(data["to_create"]) == 0

    # 4. 验证：没有关于缺少 author 字段的错误
    assert len(data["errors"]) == 0


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_preview_processes_normal_posts_in_category_dir(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir,
    git_commit_helper,
    superadmin_user,
):
    """测试：预览时应正常处理分类目录下的普通文章"""
    # 1. 创建分类目录
    category_dir = mock_content_dir / "articles" / "tech"
    category_dir.mkdir(parents=True, exist_ok=True)

    # 2. 创建分类 index.md（应被跳过）
    category_index = category_dir / "index.md"
    category_index.write_text(
        """---
title: "Tech Category"
---
Category description.
""",
        encoding="utf-8",
    )

    # 3. 创建普通文章（应被处理）
    normal_post = category_dir / "my-article.md"
    normal_post.write_text(
        f"""---
title: "My Tech Article"
slug: "my-tech-article"
author: "{superadmin_user.username}"
published: true
---

# Article Content

This is a normal article.
""",
        encoding="utf-8",
    )

    git_commit_helper("Add category and article")

    # 4. 调用预览 API
    response = await async_client.get(
        f"{settings.API_PREFIX}/ops/git/preview",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200
    data = response.json()

    # 5. 验证：只有普通文章出现在待创建列表中
    assert len(data["to_create"]) == 1
    assert "my-article.md" in data["to_create"][0]["file"]
    assert data["to_create"][0]["title"] == "My Tech Article"

    # 6. 验证：没有错误
    assert len(data["errors"]) == 0


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_sync_skips_category_index_files(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir,
    git_commit_helper,
    session,
):
    """测试：实际同步时也应跳过分类 index.md"""
    from app.posts.model import Post
    from sqlmodel import select

    # 1. 创建多个分类的 index.md
    for category_name in ["tech", "life", "ideas"]:
        category_dir = mock_content_dir / "articles" / category_name
        category_dir.mkdir(parents=True, exist_ok=True)

        index_file = category_dir / "index.md"
        index_file.write_text(
            f"""---
title: "{category_name.title()} Category"
---
Description for {category_name}.
""",
            encoding="utf-8",
        )

    git_commit_helper("Add multiple category indexes")

    # 2. 执行同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200
    data = response.json()

    # 3. 验证：没有文章被添加
    assert len(data["added"]) == 0

    # 4. 验证：数据库中没有创建文章
    stmt = select(Post)
    result = await session.exec(stmt)
    posts = result.all()
    assert len(posts) == 0


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_ideas_category_index_also_skipped(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir,
    git_commit_helper,
):
    """测试：ideas 目录下的 index.md 也应被跳过"""
    # 1. 创建 ideas 分类的 index.md
    ideas_dir = mock_content_dir / "ideas" / "testIdeas"
    ideas_dir.mkdir(parents=True, exist_ok=True)

    index_file = ideas_dir / "index.md"
    index_file.write_text(
        """---
title: "Test Ideas"
---
This is a test ideas category.
""",
        encoding="utf-8",
    )

    git_commit_helper("Add ideas category index")

    # 2. 调用预览
    response = await async_client.get(
        f"{settings.API_PREFIX}/ops/git/preview",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200
    data = response.json()

    # 3. 验证：没有待创建的文章
    assert len(data["to_create"]) == 0

    # 4. 验证：没有关于缺少 author 的错误
    for error in data.get("errors", []):
        assert "author" not in error.get("message", "").lower()
