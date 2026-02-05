"""
测试 Git 同步的分类排序功能
"""

from pathlib import Path

import frontmatter
import pytest
from app.core.config import settings
from app.posts.model import Category, PostSortOrder
from httpx import AsyncClient
from sqlmodel import select


@pytest.mark.asyncio
async def test_sync_category_post_sort_and_writeback(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    superadmin_user,
    session,
):
    """
    测试：
    1. index.md 中指定 post_sort 能被同步到数据库
    2. 同步后 index.md 中应新增 category_id 且 post_sort 字段被保留 (回写验证)
    """
    # 1. 准备目录结构
    # content/articles/test_sort/index.md
    category_slug = "test-sort-category"
    category_dir = mock_content_dir / "articles" / category_slug
    category_dir.mkdir(parents=True, exist_ok=True)

    index_file = category_dir / "index.md"
    original_content = f"""---
title: "Test Sort Category"
slug: "{category_slug}"
post_sort: "title_asc"
description: "Category for sort testing"
---
"""
    index_file.write_text(original_content, encoding="utf-8")

    # 2. 执行同步 (强制全量)
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200
    data = response.json()
    # 应该是 updated 或者是 added，取决于 scanner 是否视为新文件
    # 这里通常是 update，因为我们会先扫描到目录结构
    assert len(data["updated"]) > 0 or len(data["added"]) > 0

    # 3. 验证数据库状态
    session.expire_all()
    stmt = select(Category).where(Category.slug == category_slug)
    result = await session.exec(stmt)
    category = result.one()

    # 验证数据库中是否正确设置了排序
    assert category.post_sort_order == PostSortOrder.TITLE_ASC
    assert category.name == "Test Sort Category"

    # 4. 验证回写 (index.md)
    # 重新读取文件
    new_content = index_file.read_text(encoding="utf-8")
    fm = frontmatter.loads(new_content)

    # 验证关键字段是否回写成功
    assert "category_id" in fm.metadata
    assert fm.metadata["category_id"] == str(category.id)

    # 关键验证：post_sort 字段应该依然存在
    assert "post_sort" in fm.metadata
    assert fm.metadata["post_sort"] == "title_asc"


@pytest.mark.asyncio
async def test_sync_category_post_sort_update(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    superadmin_user,
    session,
):
    """
    测试：修改 index.md 中的 post_sort，同步后数据库应更新
    """
    # 1. 准备目录结构
    category_slug = "test-update-sort"
    category_dir = mock_content_dir / "articles" / category_slug
    category_dir.mkdir(parents=True, exist_ok=True)

    index_file = category_dir / "index.md"
    # 初始状态：published_at_desc (默认)
    index_file.write_text(
        f"""---
title: "Update Sort Test"
slug: "{category_slug}"
post_sort: "published_at_desc"
---
""",
        encoding="utf-8",
    )

    # 第一次同步
    await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )

    # 验证初始状态
    session.expire_all()
    stmt = select(Category).where(Category.slug == category_slug)
    category = (await session.exec(stmt)).one()
    assert category.post_sort_order == PostSortOrder.PUBLISHED_AT_DESC

    # 2. 修改文件：改为 views_desc
    updated_content = f"""---
title: "Update Sort Test"
slug: "{category_slug}"
post_sort: "title_desc"
category_id: "{category.id}"
---
"""
    index_file.write_text(updated_content, encoding="utf-8")

    # 3. 第二次同步
    await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )

    # 4. 验证数据库更新
    session.expire_all()
    category = (await session.exec(stmt)).one()
    assert category.post_sort_order == PostSortOrder.TITLE_DESC

    # 5. 验证回写保持
    new_fm = frontmatter.loads(index_file.read_text())
    assert new_fm.metadata["post_sort"] == "title_desc"
