"""Inbound sync never writes back; failed imports keep their retry cursor."""
import pytest
from app.git_ops.schema import SyncError
from app.git_ops.services.sync_service import SyncService

@pytest.mark.parametrize("full", [True, False])
@pytest.mark.parametrize("failed", [True, False])
async def test_sync_only_advances_on_success(full, failed, mock_session, mock_container, mock_user, mocker):
    mocker.patch("app.git_ops.services.sync_service.post_crud.get_posts_with_source_path", return_value=[])
    mocker.patch("app.git_ops.services.sync_service.post_crud.get_posts_by_source_paths", return_value=[])
    mocker.patch("app.git_ops.services.sync_service.revalidate_nextjs_cache")
    mock_container.hash_manager.get_changed_files_since_last_sync.return_value = [("M", "articles/test/post.md")]
    async def reconcile(session, files, existing, user, stats):
        stats.updated.append("articles/test/post.md")
        if failed:
            stats.errors.append(SyncError(context="test", code="TEST", message="retry me"))
    method = "reconcile_full_sync" if full else "reconcile_incremental_sync"
    setattr(mock_container.sync_processor, method, mocker.AsyncMock(side_effect=reconcile))
    service = SyncService(mock_session, mock_container)
    stats = await (service.sync_all(mock_user) if full else service.sync_incremental(mock_user))
    assert stats.updated
    mock_container.github.auto_commit_metadata.assert_not_called()
    mock_container.github.commit_and_push.assert_not_called()
    mock_container.sync_processor.sync_categories_to_disk.assert_not_called()
    for method in ("add", "commit", "push"):
        getattr(mock_container.git_client, method).assert_not_called()
    assert mock_container.hash_manager.save_current_hash.await_count == (0 if failed else 1)
    if not full:
        mock_container.hash_manager.get_changed_files_since_last_sync.assert_awaited_once()
        mock_container.hash_manager.get_changed_files_between.assert_not_called()

async def test_non_markdown_commit_advances_cursor(mock_session, mock_container, mock_user, mocker):
    mock_container.hash_manager.get_changed_files_since_last_sync.return_value = [("M", "image.png")]
    mock_container.sync_processor.reconcile_incremental_sync = mocker.AsyncMock()
    await SyncService(mock_session, mock_container).sync_incremental(mock_user)
    mock_container.hash_manager.save_current_hash.assert_awaited_once()
