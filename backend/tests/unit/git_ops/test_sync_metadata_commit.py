"""
测试同步服务的元数据提交功能

使用 conftest.py 中的公共 fixture，减少重复代码
TODO: 重写这些测试以使用新的函数式 API
"""

import pytest
from app.git_ops.schema import SyncStats


@pytest.mark.skip(reason="需要重写以适配函数式 API")
@pytest.mark.unit
@pytest.mark.asyncio
class TestSyncMetadataCommit:
    """测试元数据提交功能"""

    async def test_commit_metadata_changes_with_added_files(
        self, mock_container, mock_commit_service
    ):
        """测试有新增文件时提交元数据"""
        stats = SyncStats()
        stats.added = ["posts/new-post.mdx"]
        stats.updated = []

        # TODO: 使用新的函数式 API
        # await auto_commit_metadata(mock_container.git_client, added_count=1, updated_count=0)

        # 验证
        mock_commit_service.auto_commit.assert_called_once()
        call_args = mock_commit_service.auto_commit.call_args[0]
        assert "chore: sync metadata from database" in call_args[0]
        assert "+1" in call_args[0]

    async def test_commit_metadata_changes_with_updated_files(
        self, mock_container, mock_commit_service
    ):
        """测试有更新文件时提交元数据"""
        stats = SyncStats()
        stats.added = []
        stats.updated = ["posts/existing-post.mdx", "posts/another-post.mdx"]

        # TODO: 使用新的函数式 API

        # 验证
        mock_commit_service.auto_commit.assert_called_once()
        call_args = mock_commit_service.auto_commit.call_args[0]
        assert "chore: sync metadata from database" in call_args[0]
        assert "~2" in call_args[0]

    async def test_commit_metadata_changes_with_both(
        self, mock_container, mock_commit_service
    ):
        """测试同时有新增和更新文件时提交元数据"""
        stats = SyncStats()
        stats.added = ["posts/new-post.mdx"]
        stats.updated = ["posts/existing-post.mdx"]

        # TODO: 使用新的函数式 API

        # 验证
        mock_commit_service.auto_commit.assert_called_once()
        call_args = mock_commit_service.auto_commit.call_args[0]
        assert "chore: sync metadata from database" in call_args[0]
        assert "+1" in call_args[0]
        assert "~1" in call_args[0]

    async def test_commit_metadata_changes_no_changes(
        self, mock_container, mock_commit_service
    ):
        """测试没有变更时不提交"""
        stats = SyncStats()
        stats.added = []
        stats.updated = []

        # TODO: 使用新的函数式 API
        # 应该不调用 auto_commit_metadata

        # 验证：不应该调用 CommitService
        mock_commit_service.auto_commit.assert_not_called()

    async def test_commit_metadata_changes_handles_errors(self, mock_container, mocker):
        """测试提交失败时不影响同步流程"""
        stats = SyncStats()
        stats.added = ["posts/new-post.mdx"]

        # Mock CommitService 抛出异常（覆盖 conftest 中的 fixture）
        mock_service = mocker.MagicMock()
        mock_service.auto_commit = mocker.AsyncMock(
            side_effect=Exception("Git push failed")
        )

        mocker.patch(
            "app.git_ops.services.commit_service.CommitService",
            return_value=mock_service,
        )

        # TODO: 使用新的函数式 API
        # 执行测试 - 不应该抛出异常

        # 验证：尝试了提交但失败了
        mock_service.auto_commit.assert_called_once()
