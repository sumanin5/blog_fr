"""
单元测试：GitHubComponent
"""

import pytest

from app.git_ops.components.github import GitHubComponent
from app.git_ops.exceptions import GitOpsReadOnlyError, NotGitRepositoryError


@pytest.mark.unit
@pytest.mark.asyncio
async def test_github_pull_success(mock_git_client, tmp_path):
    """测试 pull 成功"""
    # 准备环境 (需要 .git 目录)
    (tmp_path / ".git").mkdir()

    # Mock get_current_hash to return different hashes before and after pull
    mock_git_client.get_current_hash.side_effect = ["old_hash_123", "new_hash_456"]

    component = GitHubComponent(tmp_path, mock_git_client)
    output, old_hash, new_hash = await component.pull()

    assert old_hash == "old_hash_123"
    assert new_hash == "new_hash_456"
    mock_git_client.pull.assert_called_once()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_github_pull_not_a_repo(mock_git_client, tmp_path):
    """测试在非 git 目录 pull 应该抛出异常"""
    component = GitHubComponent(tmp_path, mock_git_client)
    with pytest.raises(NotGitRepositoryError):
        await component.pull()


@pytest.mark.parametrize("method,args", [("commit_and_push", ("save",)), ("auto_commit_metadata", (1, 2, 3))])
async def test_github_outbound_rejected(method, args, mock_git_client, tmp_path):
    component = GitHubComponent(tmp_path, mock_git_client)
    with pytest.raises(GitOpsReadOnlyError):
        await getattr(component, method)(*args)
    mock_git_client.add.assert_not_called()
    mock_git_client.commit.assert_not_called()
    mock_git_client.push.assert_not_called()
