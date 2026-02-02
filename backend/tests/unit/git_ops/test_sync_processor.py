"""
单元测试：SyncProcessor
"""

import pytest
from app.git_ops.components.handlers.file_processor import SyncProcessor
from app.git_ops.schema import SyncStats


@pytest.mark.unit
@pytest.mark.asyncio
async def test_process_scanned_file_category(
    mock_container, mock_session, mock_user, mocker
):
    """测试处理全量扫描到的分类 index 文件"""
    processor = SyncProcessor(
        mock_container.scanner, mock_container.serializer, mock_container.content_dir
    )

    mock_scanned = mocker.MagicMock()
    mock_scanned.is_category_index = True
    mock_scanned.file_path = "category/index.md"

    # Mock handle_category_sync
    mock_handle = mocker.patch(
        "app.git_ops.components.handlers.file_processor.handle_category_sync",
        new_callable=mocker.AsyncMock,
    )

    stats = SyncStats()
    await processor.process_scanned_file(
        mock_session, "category/index.md", mock_scanned, {}, mock_user, stats, set()
    )

    mock_handle.assert_called_once()
    assert "category/index.md" in stats.updated


@pytest.mark.unit
@pytest.mark.asyncio
async def test_process_scanned_file_post_create(
    mock_container, mock_session, mock_user, mocker
):
    """测试处理全量扫描到的新文章"""
    processor = SyncProcessor(
        mock_container.scanner, mock_container.serializer, mock_container.content_dir
    )

    mock_scanned = mocker.MagicMock()
    mock_scanned.is_category_index = False

    # Mock handle_post_create
    mock_create = mocker.patch(
        "app.git_ops.components.handlers.file_processor.handle_post_create",
        new_callable=mocker.AsyncMock,
    )

    stats = SyncStats()
    await processor.process_scanned_file(
        mock_session,
        "posts/new.md",
        mock_scanned,
        {},  # Empty existing map means new
        mock_user,
        stats,
        set(),
    )

    mock_create.assert_called_once()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_process_file_change_delete(
    mock_container, mock_session, mock_user, mocker
):
    """测试增量同步中的删除操作"""
    processor = SyncProcessor(
        mock_container.scanner, mock_container.serializer, mock_container.content_dir
    )

    # 模拟数据库中存在的文章
    mock_post = mocker.MagicMock()
    mock_post.id = 123
    existing_map = {"posts/deleted.md": mock_post}

    # Mock post_service.delete_post
    mock_delete = mocker.patch(
        "app.git_ops.components.handlers.file_processor.post_service.delete_post",
        new_callable=mocker.AsyncMock,
    )

    stats = SyncStats()
    await processor.process_file_change(
        mock_session, "posts/deleted.md", "D", existing_map, mock_user, stats, set()
    )

    mock_delete.assert_called_once_with(mock_session, 123, current_user=mock_user)
    assert "posts/deleted.md" in stats.deleted


@pytest.mark.unit
@pytest.mark.asyncio
async def test_reconcile_incremental_sync_batch_processing(
    mock_container, mock_session, mock_user, mocker
):
    """测试增量同步的批量调度与过滤逻辑"""
    processor = SyncProcessor(
        mock_container.scanner, mock_container.serializer, mock_container.content_dir
    )

    # Mock process_file_change
    mock_process = mocker.patch.object(
        processor, "process_file_change", new_callable=mocker.AsyncMock
    )

    # 模拟输入数据
    changed_files = [
        ("A", "posts/new.md"),  # Should process
        ("M", "posts/update.md"),  # Should process
        ("M", "config.yml"),  # Should skip (extension)
        ("D", "posts/old.md"),  # Should process
        ("M", "index.md"),  # Should process (category index)
    ]
    existing_map = {}
    stats = SyncStats()

    await processor.reconcile_incremental_sync(
        mock_session, changed_files, existing_map, mock_user, stats
    )

    # 验证调用次数：应该只调用 4 次（config.yml 被跳过）
    assert mock_process.call_count == 4

    # 验证调用参数
    expected_calls = [
        mocker.call(
            mock_session, "posts/new.md", "A", existing_map, mock_user, stats, set()
        ),
        mocker.call(
            mock_session, "posts/update.md", "M", existing_map, mock_user, stats, set()
        ),
        mocker.call(
            mock_session, "posts/old.md", "D", existing_map, mock_user, stats, set()
        ),
        mocker.call(
            mock_session, "index.md", "M", existing_map, mock_user, stats, set()
        ),
    ]
    mock_process.assert_has_calls(expected_calls, any_order=True)

    # 验证错误隔离：模拟其中一个文件处理报错
    mock_process.side_effect = [None, Exception("Boom!"), None, None]

    # Reset stats and mock
    stats = SyncStats()
    mock_process.reset_mock()
    mock_process.side_effect = [None, Exception("Boom!"), None, None]

    await processor.reconcile_incremental_sync(
        mock_session, changed_files, existing_map, mock_user, stats
    )

    # 确认记录了错误，但程序未崩溃
    assert len(stats.errors) == 1
    # stats.errors contains SyncError objects
    assert "Boom!" in stats.errors[0].message
