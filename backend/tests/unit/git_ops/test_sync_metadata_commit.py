"""
测试同步服务的元数据提交功能
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.git_ops.schema import SyncStats
from app.git_ops.services.sync_service import SyncService


@pytest.mark.unit
@pytest.mark.asyncio
class TestSyncMetadataCommit:
    """测试元数据提交功能"""

    async def test_commit_metadata_changes_with_added_files(self):
        """测试有新增文件时提交元数据"""
        # 准备测试数据
        stats = SyncStats()
        stats.added = ["posts/new-post.mdx"]
        stats.updated = []

        # Mock 依赖
        mock_session = MagicMock()
        mock_git_client = MagicMock()
        mock_content_dir = MagicMock()

        # 创建 mock 容器
        mock_container = MagicMock()
        mock_container.session = mock_session
        mock_container.git_client = mock_git_client
        mock_container.content_dir = mock_content_dir

        # 创建 SyncService 实例
        sync_service = SyncService(
            session=mock_session,
            container=mock_container,
        )

        # Mock CommitService
        with patch(
            "app.git_ops.services.commit_service.CommitService"
        ) as MockCommitService:
            mock_commit_service = MagicMock()
            mock_commit_service.auto_commit = AsyncMock()
            MockCommitService.return_value = mock_commit_service

            # 执行测试
            await sync_service._commit_metadata_changes(stats)

            # 验证
            MockCommitService.assert_called_once_with(
                session=mock_session,
                container=mock_container,  # 使用 container 而不是单独的参数
            )
            mock_commit_service.auto_commit.assert_called_once()
            call_args = mock_commit_service.auto_commit.call_args[0]
            assert "chore: sync metadata from database" in call_args[0]
            assert "+1" in call_args[0]

    async def test_commit_metadata_changes_with_updated_files(self):
        """测试有更新文件时提交元数据"""
        # 准备测试数据
        stats = SyncStats()
        stats.added = []
        stats.updated = ["posts/existing-post.mdx", "posts/another-post.mdx"]

        # Mock 依赖
        mock_session = MagicMock()
        mock_git_client = MagicMock()
        mock_content_dir = MagicMock()

        # 创建 mock 容器
        mock_container = MagicMock()
        mock_container.session = mock_session
        mock_container.git_client = mock_git_client
        mock_container.content_dir = mock_content_dir

        # 创建 SyncService 实例
        sync_service = SyncService(
            session=mock_session,
            container=mock_container,
        )

        # Mock CommitService
        with patch(
            "app.git_ops.services.commit_service.CommitService"
        ) as MockCommitService:
            mock_commit_service = MagicMock()
            mock_commit_service.auto_commit = AsyncMock()
            MockCommitService.return_value = mock_commit_service

            # 执行测试
            await sync_service._commit_metadata_changes(stats)

            # 验证
            mock_commit_service.auto_commit.assert_called_once()
            call_args = mock_commit_service.auto_commit.call_args[0]
            assert "chore: sync metadata from database" in call_args[0]
            assert "~2" in call_args[0]

    async def test_commit_metadata_changes_with_both(self):
        """测试同时有新增和更新文件时提交元数据"""
        # 准备测试数据
        stats = SyncStats()
        stats.added = ["posts/new-post.mdx"]
        stats.updated = ["posts/existing-post.mdx"]

        # Mock 依赖
        mock_session = MagicMock()
        mock_git_client = MagicMock()
        mock_content_dir = MagicMock()

        # 创建 mock 容器
        mock_container = MagicMock()
        mock_container.session = mock_session
        mock_container.git_client = mock_git_client
        mock_container.content_dir = mock_content_dir

        # 创建 SyncService 实例
        sync_service = SyncService(
            session=mock_session,
            container=mock_container,
        )

        # Mock CommitService
        with patch(
            "app.git_ops.services.commit_service.CommitService"
        ) as MockCommitService:
            mock_commit_service = MagicMock()
            mock_commit_service.auto_commit = AsyncMock()
            MockCommitService.return_value = mock_commit_service

            # 执行测试
            await sync_service._commit_metadata_changes(stats)

            # 验证
            mock_commit_service.auto_commit.assert_called_once()
            call_args = mock_commit_service.auto_commit.call_args[0]
            assert "chore: sync metadata from database" in call_args[0]
            assert "+1" in call_args[0]
            assert "~1" in call_args[0]

    async def test_commit_metadata_changes_no_changes(self):
        """测试没有变更时不提交"""
        # 准备测试数据
        stats = SyncStats()
        stats.added = []
        stats.updated = []

        # Mock 依赖
        mock_session = MagicMock()
        mock_git_client = MagicMock()
        mock_content_dir = MagicMock()

        # 创建 mock 容器
        mock_container = MagicMock()
        mock_container.session = mock_session
        mock_container.git_client = mock_git_client
        mock_container.content_dir = mock_content_dir

        # 创建 SyncService 实例
        sync_service = SyncService(
            session=mock_session,
            container=mock_container,
        )

        # Mock CommitService
        with patch(
            "app.git_ops.services.commit_service.CommitService"
        ) as MockCommitService:
            mock_commit_service = MagicMock()
            mock_commit_service.auto_commit = AsyncMock()
            MockCommitService.return_value = mock_commit_service

            # 执行测试
            await sync_service._commit_metadata_changes(stats)

            # 验证：不应该调用 CommitService
            MockCommitService.assert_not_called()
            mock_commit_service.auto_commit.assert_not_called()

    async def test_commit_metadata_changes_handles_errors(self):
        """测试提交失败时不影响同步流程"""
        # 准备测试数据
        stats = SyncStats()
        stats.added = ["posts/new-post.mdx"]

        # Mock 依赖
        mock_session = MagicMock()
        mock_git_client = MagicMock()
        mock_content_dir = MagicMock()

        # 创建 mock 容器
        mock_container = MagicMock()
        mock_container.session = mock_session
        mock_container.git_client = mock_git_client
        mock_container.content_dir = mock_content_dir

        # 创建 SyncService 实例
        sync_service = SyncService(
            session=mock_session,
            container=mock_container,
        )

        # Mock CommitService 抛出异常
        with patch(
            "app.git_ops.services.commit_service.CommitService"
        ) as MockCommitService:
            mock_commit_service = MagicMock()
            mock_commit_service.auto_commit = AsyncMock(
                side_effect=Exception("Git push failed")
            )
            MockCommitService.return_value = mock_commit_service

            # 执行测试 - 不应该抛出异常
            await sync_service._commit_metadata_changes(stats)

            # 验证：尝试了提交但失败了
            mock_commit_service.auto_commit.assert_called_once()
