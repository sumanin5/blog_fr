"""
测试 Git 操作失败场景

验证各种 Git 操作失败时的错误处理和降级策略:
1. git pull 失败的处理
2. get_changed_files() 异常处理
3. 无效 commit hash 的处理
4. Git 仓库未初始化的场景
5. 增量同步失败时回退到全量同步
"""

from pathlib import Path

import pytest
from app.core.config import settings
from app.git_ops.exceptions import GitError
from httpx import AsyncClient


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_sync_fails_when_git_pull_fails(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    mocker,
    superadmin_user,
):
    """测试 git pull 失败时同步应该失败"""
    # 1. 创建测试文件
    test_file = mock_content_dir / "test.mdx"
    test_file.write_text(
        f"""---
title: "Test"
slug: "test"
author: "{superadmin_user.username}"
---

Content
""",
        encoding="utf-8",
    )

    # 2. Mock git pull 失败
    mock_pull = mocker.patch(
        "app.git_ops.git_client.GitClient.pull",
        side_effect=GitError("Network error: failed to pull"),
    )

    # 3. 执行同步（应该失败）
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )

    # 验证：同步失败
    assert response.status_code != 200

    # 验证：pull 被调用
    mock_pull.assert_called()


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_incremental_sync_fallback_on_git_diff_failure(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    mocker,
    superadmin_user,
):
    """测试 git diff 失败时回退到全量同步"""
    # 1. 创建初始文件并同步
    file1 = mock_content_dir / "file1.mdx"
    file1.write_text(
        f"""---
title: "File 1"
slug: "file-1"
author: "{superadmin_user.username}"
---

Content 1
""",
        encoding="utf-8",
    )
    git_commit_helper("Add file 1")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200

    # 2. 添加新文件
    file2 = mock_content_dir / "file2.mdx"
    file2.write_text(
        f"""---
title: "File 2"
slug: "file-2"
author: "{superadmin_user.username}"
---

Content 2
""",
        encoding="utf-8",
    )
    git_commit_helper("Add file 2")

    # 3. Mock get_changed_files 失败
    mocker.patch(
        "app.git_ops.git_client.GitClient.get_changed_files",
        side_effect=GitError("Invalid commit hash"),
    )

    # 4. 执行增量同步（应该自动回退到全量同步）
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200
    data = response.json()

    # 验证：新文件被同步（说明执行了全量同步）
    assert len(data["added"]) >= 1
    assert any("file2.mdx" in path for path in data["added"])


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_sync_with_corrupted_hash_file(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    superadmin_user,
):
    """测试 .gitops_last_sync 文件损坏时的处理"""
    # 1. 创建测试文件
    test_file = mock_content_dir / "test.mdx"
    test_file.write_text(
        f"""---
title: "Test"
slug: "test"
author: "{superadmin_user.username}"
---

Content
""",
        encoding="utf-8",
    )
    git_commit_helper("Add test file")

    # 2. 创建损坏的 hash 文件
    hash_file = mock_content_dir / ".gitops_last_sync"
    hash_file.write_text("invalid-hash-format")

    # 3. 执行增量同步（应该失败）
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code != 200


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_sync_with_empty_hash_file(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    superadmin_user,
):
    """测试空的 .gitops_last_sync 文件"""
    # 1. 创建测试文件
    test_file = mock_content_dir / "test.mdx"
    test_file.write_text(
        f"""---
title: "Test"
slug: "test"
author: "{superadmin_user.username}"
---

Content
""",
        encoding="utf-8",
    )
    git_commit_helper("Add test file")

    # 2. 创建空的 hash 文件
    hash_file = mock_content_dir / ".gitops_last_sync"
    hash_file.write_text("")

    # 3. 执行增量同步（应该失败）
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code != 200


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_get_current_hash_failure_handling(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    mocker,
    superadmin_user,
):
    """测试获取当前 hash 失败的处理"""
    # 1. 创建测试文件
    test_file = mock_content_dir / "test.mdx"
    test_file.write_text(
        f"""---
title: "Test"
slug: "test"
author: "{superadmin_user.username}"
---

Content
""",
        encoding="utf-8",
    )

    # 2. Mock get_current_hash 失败
    mocker.patch(
        "app.git_ops.git_client.GitClient.get_current_hash",
        side_effect=GitError("Failed to get current hash"),
    )

    # 3. 执行同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )

    # 验证:同步失败(因为无法获取 hash)
    assert response.status_code == 500


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_incremental_sync_with_no_commits(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    mocker,
    superadmin_user,
):
    """测试增量同步时 Git 仓库没有新提交"""
    # 1. 创建文件并同步
    test_file = mock_content_dir / "test.mdx"
    test_file.write_text(
        f"""---
title: "Test"
slug: "test"
author: "{superadmin_user.username}"
---

Content
""",
        encoding="utf-8",
    )
    git_commit_helper("Add test file")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200

    # 2. 不做任何修改，执行增量同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200
    data = response.json()

    # 验证：没有变更
    assert len(data["added"]) == 0
    assert len(data["updated"]) == 0
    assert len(data["deleted"]) == 0


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_sync_with_git_diff_returning_empty_list(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    mocker,
    superadmin_user,
):
    """测试 git diff 返回空列表的场景"""
    # 1. 创建文件并同步
    test_file = mock_content_dir / "test.mdx"
    test_file.write_text(
        f"""---
title: "Test"
slug: "test"
author: "{superadmin_user.username}"
---

Content
""",
        encoding="utf-8",
    )
    git_commit_helper("Add test file")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200

    # 2. 添加新文件但 mock git diff 返回空列表
    new_file = mock_content_dir / "new.mdx"
    new_file.write_text(
        f"""---
title: "New"
slug: "new"
author: "{superadmin_user.username}"
---

Content
""",
        encoding="utf-8",
    )
    git_commit_helper("Add new file")

    # Mock get_changed_files 返回空列表
    mocker.patch(
        "app.git_ops.git_client.GitClient.get_changed_files_with_status",
        return_value=[],
    )

    # 3. 执行增量同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200
    data = response.json()

    # 验证：没有变更（因为 diff 返回空）
    assert len(data["added"]) == 0
    assert len(data["updated"]) == 0
    assert len(data["deleted"]) == 0


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_sync_with_partial_git_operations_failure(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    mocker,
    superadmin_user,
):
    """测试部分 Git 操作失败但同步继续"""
    # 1. 创建多个文件
    for i in range(3):
        file = mock_content_dir / f"post-{i}.mdx"
        file.write_text(
            f"""---
title: "Post {i}"
slug: "post-{i}"
author: "{superadmin_user.username}"
---

Content {i}
""",
            encoding="utf-8",
        )
    git_commit_helper("Add posts")

    # 2. Mock pull 失败但其他操作正常
    mocker.patch(
        "app.git_ops.git_client.GitClient.pull",
        side_effect=GitError("Pull failed"),
    )

    # 3. 执行同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code != 200


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_sync_recovers_from_transient_git_errors(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    mocker,
    superadmin_user,
):
    """测试从临时 Git 错误中恢复"""
    # 1. 创建测试文件
    test_file = mock_content_dir / "test.mdx"
    test_file.write_text(
        f"""---
title: "Test"
slug: "test"
author: "{superadmin_user.username}"
---

Content
""",
        encoding="utf-8",
    )
    git_commit_helper("Add test file")

    # 2. 第一次同步：pull 失败
    mock_pull = mocker.patch(
        "app.git_ops.git_client.GitClient.pull",
        side_effect=GitError("Temporary network error"),
    )

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )
    assert response.status_code != 200

    # 3. 第二次同步：pull 恢复正常
    mock_pull.side_effect = None
    mock_pull.return_value = "Already up to date."

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200
    data = response.json()

    # 验证：第二次同步成功且没有 pull 错误
    # 注意：可能仍有其他错误，但不应该有 Git Pull 错误
    git_pull_errors = [err for err in data["errors"] if "Git Pull" in str(err)]
    assert len(git_pull_errors) == 0
