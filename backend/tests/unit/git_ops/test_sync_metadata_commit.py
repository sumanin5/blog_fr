"""
测试同步服务的元数据提交功能

测试 SyncService 是否在检测到变更时正确调用 GitHubComponent.auto_commit_metadata
"""

import pytest
from app.git_ops.services.sync_service import SyncService


@pytest.mark.unit
@pytest.mark.asyncio
class TestSyncMetadataCommit:
    """测试元数据提交触发逻辑"""

    @pytest.fixture
    def sync_service(self, mock_session, mock_container):
        """创建 SyncService 实例"""
        return SyncService(mock_session, container=mock_container)

    async def test_commit_metadata_when_changes_detected(
        self, sync_service, mock_container, mocker
    ):
        """测试：当有文件变更时，应该触发 auto_commit_metadata"""

        # 1. Mock Scanner: 返回一个模拟文件
        mock_post = mocker.MagicMock()
        mock_post.file_path = "posts/new-post.md"
        mock_container.scanner.scan_all.return_value = [mock_post]

        # 2. Mock SyncProcessor.reconcile_full_sync
        # 模拟全量对齐过程中发现了变更 (added)
        # 方法签名: reconcile_full_sync(session, scanned_map, existing_map, user, stats)
        # stats 是第 5 个参数 (索引 4)
        async def reconcile_side_effect(*args, **kwargs):
            if len(args) > 4:
                stats = args[4]
                stats.added.append("posts/new-post.md")

        mock_container.sync_processor.reconcile_full_sync.side_effect = (
            reconcile_side_effect
        )

        # 3. Mock 外部依赖以避免报错
        mocker.patch(
            "app.git_ops.services.sync_service.post_crud.get_posts_with_source_path",
            return_value=[],
        )
        mocker.patch("app.git_ops.services.sync_service.revalidate_nextjs_cache")
        mocker.patch("app.users.crud.get_superuser", return_value=mocker.MagicMock())

        # 4. Mock category sync to avoid errors (it's called after reconcile)
        mock_container.sync_processor.sync_categories_to_disk = mocker.AsyncMock()

        # 执行全量同步
        await sync_service.sync_all()

        # 验证: 确认调用了 update
        mock_container.github.auto_commit_metadata.assert_called_once()

        # 验证: 确认调用了 reconcile
        mock_container.sync_processor.reconcile_full_sync.assert_called_once()

        # 验证参数: added_count=1
        call_kwargs = mock_container.github.auto_commit_metadata.call_args.kwargs
        assert call_kwargs.get("added_count") == 1
        assert call_kwargs.get("updated_count") == 0

    async def test_no_commit_when_no_changes(
        self, sync_service, mock_container, mocker
    ):
        """测试：无变更时不触发提交"""
        # Mock 无变更
        mock_container.scanner.scan_all.return_value = []

        # Explicitly make reconcile_full_sync awaitable (AsyncMock)
        mock_container.sync_processor.reconcile_full_sync = mocker.AsyncMock()

        mocker.patch(
            "app.git_ops.services.sync_service.post_crud.get_posts_with_source_path",
            return_value=[],
        )
        mocker.patch("app.users.crud.get_superuser", return_value=mocker.MagicMock())
        mocker.patch("app.git_ops.services.sync_service.revalidate_nextjs_cache")
        # Mock category sync logic
        mock_container.sync_processor.sync_categories_to_disk = mocker.AsyncMock()

        await sync_service.sync_all()

        # 验证: 不应调用
        mock_container.github.auto_commit_metadata.assert_not_called()
