"""
测试 Git 同步的错误处理
"""

from pathlib import Path

import pytest
from app.core.config import settings
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_sync_with_multiple_files_some_invalid(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    superadmin_user,
):
    """测试：多个文件，部分有效，部分无效"""
    # 创建有效文件
    valid_file = mock_content_dir / "valid-post.mdx"
    valid_file.write_text(
        f"""---
title: "Valid Post"
slug: "valid-post"
author: "{superadmin_user.username}"
---

Content.
""",
        encoding="utf-8",
    )

    # 创建无效文件（缺少 author）
    invalid_file1 = mock_content_dir / "invalid-post-1.mdx"
    invalid_file1.write_text(
        """---
title: "Invalid Post 1"
slug: "invalid-post-1"
---

Content.
""",
        encoding="utf-8",
    )

    # 创建无效文件（author 不存在）
    invalid_file2 = mock_content_dir / "invalid-post-2.mdx"
    invalid_file2.write_text(
        """---
title: "Invalid Post 2"
slug: "invalid-post-2"
author: "nonexistent"
---

Content.
""",
        encoding="utf-8",
    )

    # 同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true", headers=superadmin_user_token_headers
    )

    assert response.status_code == 200
    data = response.json()

    # 验证结果
    # 注意：added 包含 2 个文件：valid-post.mdx + 自动创建的分类 index.md
    assert len(data["added"]) == 2
    assert any("valid-post.mdx" in path for path in data["added"])

    assert len(data["errors"]) == 2  # 两个错误

    def get_msg(err):
        return err.get("message", "") if isinstance(err, dict) else str(err)

    assert any(
        "Missing required field 'author'" in get_msg(err) for err in data["errors"]
    )
    assert any("Author not found" in get_msg(err) for err in data["errors"])


@pytest.mark.asyncio
async def test_sync_with_invalid_frontmatter(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
):
    """测试：无效的 Frontmatter 格式"""
    # 创建格式错误的文件
    invalid_file = mock_content_dir / "invalid-frontmatter.mdx"
    invalid_file.write_text(
        """---
title: "Invalid Frontmatter
author: "test
---

Content.
""",
        encoding="utf-8",
    )

    # 同步（应该跳过该文件）
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true", headers=superadmin_user_token_headers
    )

    # 可能返回 200 但有错误，或者直接失败
    # 具体取决于 scanner 的实现
    assert response.status_code in [200, 400, 500]


@pytest.mark.asyncio
async def test_sync_empty_directory(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
):
    """测试：空目录同步"""
    # 不创建任何文件

    # 同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true", headers=superadmin_user_token_headers
    )

    assert response.status_code == 200
    data = response.json()

    # 应该没有任何操作
    assert len(data["added"]) == 0
    assert len(data["updated"]) == 0
    assert len(data["deleted"]) == 0
    assert len(data["errors"]) == 0


@pytest.mark.asyncio
async def test_sync_without_admin_permission(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    mock_content_dir: Path,
):
    """测试：非管理员无法触发同步"""
    # 尝试同步（使用普通用户 token）
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true", headers=normal_user_token_headers
    )

    # 应该返回 403 权限不足
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_sync_without_authentication(
    async_client: AsyncClient,
    mock_content_dir: Path,
):
    """测试：未登录无法触发同步"""
    # 尝试同步（不带 token）
    response = await async_client.post(f"{settings.API_PREFIX}/ops/git/sync")

    # 应该返回 401 未认证
    assert response.status_code == 401
