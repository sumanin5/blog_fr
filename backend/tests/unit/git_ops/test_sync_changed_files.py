"""
单元测试：定向工作区文件同步（sync_changed_files 与 sync_git_content --change）
"""

from contextlib import asynccontextmanager
import importlib.util
from pathlib import Path

import pytest
from app.git_ops.services.sync_service import SyncService

SYNC_SCRIPT_PATH = Path(__file__).resolve().parents[3] / "scripts" / "sync_git_content.py"


def _load_sync_script():
    spec = importlib.util.spec_from_file_location("sync_git_content", SYNC_SCRIPT_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@asynccontextmanager
async def _noop_lock():
    yield


@pytest.mark.unit
@pytest.mark.git_ops
def test_parse_change_items_and_args():
    """验证 --change 参数与 STATUS:REL_PATH 解析和格式校验。"""
    sync_script = _load_sync_script()

    args = sync_script.parse_args(
        [
            "--change",
            "a:ideas/cat/post.mdx",
            "--change",
            r"m:articles\tech\note.md",
        ]
    )
    assert sync_script.parse_change_items(args.change) == [
        ("A", "ideas/cat/post.mdx"),
        ("M", "articles/tech/note.md"),
    ]

    for invalid in ("missing-colon", "X:ideas/cat/post.mdx", "M:   "):
        with pytest.raises(ValueError):
            sync_script.parse_change_items([invalid])


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_sync_changed_files_reconciles_without_updating_git_cursor(
    tmp_path, mocker, mock_container, mock_session, mock_user
):
    """验证定向变更同步会更新指定文章并刷新缓存，但不拉取也不推进 Git 游标。"""
    mock_container.content_dir = tmp_path
    mock_container.repository_lock = _noop_lock
    mock_container.sync_processor.reconcile_incremental_sync = mocker.AsyncMock(
        side_effect=lambda _s, _c, _e, _u, stats: stats.updated.append(
            "ideas/比特漫笔/post.mdx"
        )
    )
    mocker.patch(
        "app.git_ops.services.sync_service.post_crud.get_posts_with_source_path",
        new_callable=mocker.AsyncMock,
        return_value=[],
    )
    mock_revalidate = mocker.patch(
        "app.git_ops.services.sync_service.revalidate_nextjs_cache",
        new_callable=mocker.AsyncMock,
    )

    service = SyncService(mock_session, mock_container)
    mocker.patch.object(service, "_get_operating_user", return_value=mock_user)

    changed = [("M", "ideas/比特漫笔/post.mdx")]
    stats = await service.sync_changed_files(changed, default_user=mock_user)

    assert stats.updated == ["ideas/比特漫笔/post.mdx"]
    mock_container.validate_content.assert_awaited_once()
    mock_container.sync_processor.reconcile_incremental_sync.assert_awaited_once_with(
        mock_session,
        changed,
        {},
        mock_user,
        stats,
    )
    mock_session.commit.assert_awaited_once()
    mock_revalidate.assert_awaited_once()
    mock_container.github.pull.assert_not_awaited()
    mock_container.hash_manager.save_current_hash.assert_not_awaited()
    mock_container.hash_manager.clear_failed.assert_not_called()
    mock_container.hash_manager.mark_failed.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_sync_changed_files_skips_empty_and_non_content_paths(
    mocker, mock_container, mock_session, mock_user
):
    """空列表或非文章文档（如 README.md）不应触发数据库查询或缓存失效。"""
    mock_container.repository_lock = _noop_lock
    mock_container.sync_processor.reconcile_incremental_sync = mocker.AsyncMock()
    mock_get_posts = mocker.patch(
        "app.git_ops.services.sync_service.post_crud.get_posts_with_source_path",
        new_callable=mocker.AsyncMock,
    )
    mock_revalidate = mocker.patch(
        "app.git_ops.services.sync_service.revalidate_nextjs_cache",
        new_callable=mocker.AsyncMock,
    )

    service = SyncService(mock_session, mock_container)

    empty_stats = await service.sync_changed_files([], default_user=mock_user)
    assert empty_stats.added == []
    assert empty_stats.updated == []
    assert empty_stats.deleted == []

    doc_stats = await service.sync_changed_files(
        [("M", "README.md")], default_user=mock_user
    )
    assert doc_stats.added == []
    assert doc_stats.updated == []
    assert doc_stats.deleted == []

    mock_container.validate_content.assert_not_awaited()
    mock_get_posts.assert_not_awaited()
    mock_container.sync_processor.reconcile_incremental_sync.assert_not_awaited()
    mock_session.commit.assert_not_awaited()
    mock_revalidate.assert_not_awaited()
    mock_container.hash_manager.save_current_hash.assert_not_awaited()
