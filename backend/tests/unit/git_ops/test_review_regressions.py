"""Regression cases from the one-way sync review; no database is used."""

import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.git_ops.components.comparator import PostComparator
from app.git_ops.components.path_utils import normalize_source_path
from app.git_ops.components.processors.content import ContentProcessor
from app.git_ops.components.repository_lock import lock_repository
from app.git_ops.components.scanner import MDXScanner
from app.git_ops.container import GitOpsContainer
from app.git_ops.exceptions import GitOpsSyncError, ScanError
from app.git_ops.schema import SyncStats


@pytest.fixture
def checkout(tmp_path):
    root = tmp_path / "content"
    folder = root / "articles/tech"
    folder.mkdir(parents=True)
    (folder / "post.md").write_text("---\ntitle: Post\nslug: post\n---\nBody", encoding="utf-8")
    return root


@pytest.mark.parametrize("absolute", [False, True])
async def test_resync_then_full_sync_keeps_relative_path_and_original_id(
    absolute, checkout, mock_session, mock_user, mocker
):
    relative = "articles/tech/post.md"
    post = SimpleNamespace(id=uuid4(), slug="post", source_path=str(checkout / relative) if absolute else relative)
    original_id = post.id
    mock_session.get = mocker.AsyncMock(return_value=post)
    container = GitOpsContainer(mock_session, checkout)
    container.serializer.from_frontmatter = mocker.AsyncMock(return_value={"title": "Post", "content_mdx": "Body"})

    async def update(session, post_id, data, **kwargs):
        assert post_id == original_id
        post.source_path = data.source_path
        return post

    mocker.patch("app.posts.services.update_post", side_effect=update)
    delete = mocker.patch("app.posts.services.delete_post")
    mocker.patch("app.git_ops.services.resync_service.revalidate_nextjs_cache")
    mocker.patch("app.git_ops.services.sync_service.revalidate_nextjs_cache")
    mocker.patch("app.git_ops.services.sync_service.post_crud.get_posts_with_source_path", return_value=[post])
    container.github.pull = mocker.AsyncMock(return_value=("ok", "old", "new"))
    container.hash_manager.save_current_hash = mocker.AsyncMock()
    container.sync_processor.resolve_internal_links_for_posts = mocker.AsyncMock()
    await container.resync_service.resync_post_metadata(post.id, mock_user)
    assert post.source_path == relative
    stats = await container.sync_service.sync_all(mock_user)
    assert not stats.errors
    assert post.source_path == relative
    assert post.id == original_id
    delete.assert_not_called()


@pytest.mark.parametrize("incremental", [False, True])
@pytest.mark.parametrize("database_only", [False, True])
async def test_duplicate_slug_never_overwrites_owner(
    incremental, database_only, checkout, mock_session, mock_user, mocker
):
    new_path = "articles/tech/copy.md"
    (checkout / new_path).write_text("---\ntitle: Copy\nslug: post\n---\nCopy", encoding="utf-8")
    post = SimpleNamespace(id=uuid4(), slug="post", source_path=None if database_only else "articles/tech/post.md")
    container = GitOpsContainer(mock_session, checkout)
    mocker.patch("app.git_ops.components.handlers.file_processor.post_crud.get_post_by_slug", return_value=post)
    update = mocker.patch("app.posts.services.update_post")
    stats = SyncStats()
    with pytest.raises(GitOpsSyncError, match="conflict|original source"):
        if incremental:
            await container.sync_processor.process_file_change(mock_session, new_path, "A", {}, mock_user, stats, set())
        else:
            scanned = await container.scanner.scan_file(new_path)
            await container.sync_processor.process_scanned_file(mock_session, new_path, scanned, {}, mock_user, stats, set())
    update.assert_not_called()
    assert not stats.updated


@pytest.mark.parametrize("incremental", [False, True])
async def test_real_rename_keeps_database_identity(
    incremental, checkout, mock_session, mock_user, mocker
):
    old_path, new_path = "articles/tech/post.md", "articles/tech/renamed.md"
    (checkout / old_path).rename(checkout / new_path)
    post = SimpleNamespace(id=uuid4(), slug="post", source_path=old_path)
    container = GitOpsContainer(mock_session, checkout)
    mocker.patch("app.git_ops.components.handlers.file_processor.post_crud.get_post_by_slug", return_value=post)
    container.serializer.from_frontmatter = mocker.AsyncMock(return_value={"title": "Post", "content_mdx": "Body"})
    update = mocker.patch("app.posts.services.update_post", return_value=post)
    delete = mocker.patch("app.posts.services.delete_post")
    container.sync_processor.resolve_internal_links_for_posts = mocker.AsyncMock()
    stats = SyncStats()
    if incremental:
        await container.sync_processor.reconcile_incremental_sync(mock_session, [("D", old_path), ("A", new_path)], {old_path: post}, mock_user, stats)
    else:
        scanned = await container.scanner.scan_file(new_path)
        await container.sync_processor.reconcile_full_sync(mock_session, {new_path: scanned}, {old_path: post}, mock_user, stats)
    assert not stats.errors
    delete.assert_not_called()
    update.assert_awaited_once()
    assert update.call_args.args[1] == post.id
    assert update.call_args.args[2].source_path == new_path


async def test_full_sync_repairs_legacy_absolute_path_without_orphan_delete(
    checkout, mock_session, mock_user, mocker
):
    """历史绝对路径必须先归一化，否则会在全量对账时被误当孤儿删除。"""
    relative = "articles/tech/post.md"
    post = SimpleNamespace(
        id=uuid4(),
        slug="post",
        source_path=str((checkout / relative).resolve()),
    )
    original_id = post.id
    container = GitOpsContainer(mock_session, checkout)
    container.serializer.from_frontmatter = mocker.AsyncMock(
        return_value={"title": "Post", "content_mdx": "Body"}
    )

    async def update(session, post_id, data, **kwargs):
        assert post_id == original_id
        post.source_path = data.source_path
        return post

    mocker.patch("app.posts.services.update_post", side_effect=update)
    delete = mocker.patch("app.posts.services.delete_post")
    mocker.patch("app.git_ops.services.sync_service.revalidate_nextjs_cache")
    mocker.patch(
        "app.git_ops.services.sync_service.post_crud.get_posts_with_source_path",
        return_value=[post],
    )
    container.github.pull = mocker.AsyncMock(return_value=("ok", "old", "new"))
    container.hash_manager.save_current_hash = mocker.AsyncMock()
    container.sync_processor.resolve_internal_links_for_posts = mocker.AsyncMock()

    stats = await container.sync_service.sync_all(mock_user)

    assert not stats.errors
    assert post.source_path == relative
    assert post.id == original_id
    delete.assert_not_called()


async def test_full_sync_does_not_delete_db_post_outside_content_repo(
    checkout, mock_session, mock_user, mocker, tmp_path
):
    outside = tmp_path / "legacy" / "outside.md"
    outside.parent.mkdir()
    outside.write_text("---\ntitle: Outside\n---\n", encoding="utf-8")
    post = SimpleNamespace(
        id=uuid4(), slug="outside", source_path=str(outside.resolve())
    )
    container = GitOpsContainer(mock_session, checkout)
    mocker.patch(
        "app.git_ops.services.sync_service.post_crud.get_posts_with_source_path",
        return_value=[post],
    )
    container.scanner.scan_all = mocker.AsyncMock(return_value=[])
    container.github.pull = mocker.AsyncMock(return_value=("ok", "old", "new"))
    container.hash_manager.save_current_hash = mocker.AsyncMock()
    delete = mocker.patch("app.posts.services.delete_post")

    stats = await container.sync_service.sync_all(mock_user)

    assert any(error.code == "SOURCE_PATH_OUTSIDE" for error in stats.errors)
    delete.assert_not_called()


def test_absolute_source_path_normalizes_to_repository_relative(checkout):
    relative = "articles/tech/post.md"
    absolute = str((checkout / relative).resolve())
    assert normalize_source_path(absolute, checkout) == relative
    assert normalize_source_path(relative, checkout) == relative


async def test_scan_file_rejects_parent_traversal(tmp_path, checkout):
    outside = tmp_path / "outside.md"
    outside.write_text("---\ntitle: Outside\n---\n", encoding="utf-8")
    with pytest.raises(ScanError):
        await MDXScanner(checkout).scan_file("../outside.md")


@pytest.mark.parametrize("suffix", ["png", "gif", "svg"])
async def test_imported_image_preview_matches_and_remains_read_only(
    suffix, checkout, mock_session, mocker, monkeypatch
):
    from app.core.config import settings

    monkeypatch.setattr(settings, "CONTENT_DIR", checkout)
    image = checkout / f"articles/tech/picture.{suffix}"
    image.write_bytes(b"test image")
    source = f"![pic](./picture.{suffix})"
    scanned = SimpleNamespace(content=source, file_path="articles/tech/post.md")
    import hashlib

    media_id = uuid4()
    upload = mocker.patch.object(ContentProcessor, "_upload_and_get_media_id", return_value=media_id)
    content_hash = hashlib.sha256(image.read_bytes()).hexdigest()
    lookup = mocker.patch(
        "app.media.crud.get_media_file_by_hash",
        return_value=SimpleNamespace(id=media_id),
    )
    imported, preview = {"title": "Post"}, {"title": "Post"}
    await ContentProcessor().process(imported, {}, scanned, mock_session)
    await ContentProcessor().process(preview, {}, scanned, mock_session, dry_run=True)
    assert PostComparator.compare(SimpleNamespace(**imported), preview) == []
    upload.assert_awaited_once()
    lookup.assert_awaited_once_with(mock_session, content_hash)
    assert scanned.content == source
    assert image.read_bytes() == b"test image"


@pytest.mark.parametrize("method", ["sync_all", "sync_incremental"])
async def test_sync_failure_marks_full_sync_needed_and_releases_lock(
    method, checkout, mock_session, mock_user, mocker
):
    container = GitOpsContainer(mock_session, checkout)
    container.github.pull = mocker.AsyncMock(side_effect=RuntimeError("pull failed"))

    with pytest.raises(RuntimeError, match="pull failed"):
        await getattr(container.sync_service, method)(mock_user)

    assert container.hash_manager.needs_full_sync()
    async with asyncio.timeout(3), container.repository_lock():
        pass


async def test_lock_released_after_cancellation_and_failure(tmp_path):
    path = tmp_path / "lock"
    acquired = asyncio.Event()

    async def hold():
        async with lock_repository(path):
            acquired.set()
            await asyncio.Event().wait()

    task = asyncio.create_task(hold())
    await acquired.wait()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    with pytest.raises(RuntimeError):
        async with asyncio.timeout(3), lock_repository(path):
            raise RuntimeError("failed import")
    async with asyncio.timeout(3), lock_repository(path):
        pass


async def test_repository_lock_serializes_processes_and_recovers_after_exit(tmp_path):
    path = tmp_path / "lock"
    marker = tmp_path / "acquired"
    child_code = """
import asyncio, sys
from pathlib import Path
from app.git_ops.components.repository_lock import lock_repository
async def main():
    print('ready', flush=True)
    async with lock_repository(Path(sys.argv[1])):
        Path(sys.argv[2]).write_text('acquired')
        print('acquired', flush=True)
        await asyncio.Event().wait()
asyncio.run(main())
"""
    process = None
    try:
        async with lock_repository(path):
            process = await asyncio.create_subprocess_exec(sys.executable, "-c", child_code, str(path), str(marker), stdout=asyncio.subprocess.PIPE, cwd=Path(__file__).resolve().parents[3])
            async with asyncio.timeout(10):
                assert (await process.stdout.readline()).strip() == b"ready"
            # A live independent process cannot enter while the parent holds it.
            await asyncio.sleep(0.4)
            assert process.returncode is None
            assert not marker.exists()
        async with asyncio.timeout(10):
            assert (await process.stdout.readline()).strip() == b"acquired"
        assert marker.exists()
        # Kernel cleanup must release a lock even if the worker is killed.
        process.kill()
        await process.wait()
        async with asyncio.timeout(3), lock_repository(path):
            pass
    finally:
        if process is not None and process.returncode is None:
            process.kill()
            await process.wait()
