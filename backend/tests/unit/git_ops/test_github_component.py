"""
单元测试：GitHubComponent
"""

import pytest
from app.git_ops.components.github import GitHubComponent
from app.git_ops.exceptions import NotGitRepositoryError


@pytest.mark.unit
@pytest.mark.asyncio
async def test_github_pull_success(mock_git_client, tmp_path):
    """测试 pull 成功"""
    # 准备环境 (需要 .git 目录)
    (tmp_path / ".git").mkdir()

    component = GitHubComponent(tmp_path, mock_git_client)
    await component.pull()

    mock_git_client.pull.assert_called_once()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_github_pull_not_a_repo(mock_git_client, tmp_path):
    """测试在非 git 目录 pull 应该抛出异常"""
    component = GitHubComponent(tmp_path, mock_git_client)
    with pytest.raises(NotGitRepositoryError):
        await component.pull()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_github_commit_and_push_success(mock_git_client, tmp_path):
    """测试 commit_and_push 成功"""
    mock_git_client.get_file_status.return_value = [("M", "test.md")]

    component = GitHubComponent(tmp_path, mock_git_client)
    result = await component.commit_and_push("test message")

    assert result is True
    mock_git_client.add.assert_called_with(["."])
    mock_git_client.commit.assert_called_with("test message")
    mock_git_client.push.assert_called_once()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_github_commit_and_push_no_changes(mock_git_client, tmp_path):
    """测试没有变更时不执行 commit"""
    mock_git_client.get_file_status.return_value = []

    component = GitHubComponent(tmp_path, mock_git_client)
    result = await component.commit_and_push("test message")

    assert result is False
    mock_git_client.commit.assert_not_called()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_github_auto_commit_metadata(mock_git_client, tmp_path, mocker):
    """测试 auto_commit_metadata 的消息构建"""
    # 我们需要拦截 commit_and_push 来验证消息
    component = GitHubComponent(tmp_path, mock_git_client)
    mock_commit = mocker.patch.object(component, "commit_and_push", return_value=True)

    await component.auto_commit_metadata(
        added_count=1, updated_count=2, deleted_count=3
    )

    # 验证消息
    message = mock_commit.call_args[0][0]
    assert "chore: sync metadata from database" in message
    assert "+1" in message
    assert "~2" in message
    assert "-3" in message
