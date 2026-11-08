"""Final migration, import-policy and media-identity regressions."""

import hashlib
import importlib.util
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.git_ops.components.handlers.file_processor import SyncProcessor
from app.git_ops.components.processors.cover import CoverProcessor
from app.git_ops.schema import SyncStats
from app.git_ops.services.sync_service import SyncService


@pytest.fixture
def migration():
    path = Path(__file__).resolve().parents[4] / "scripts/migrate_duplicate_categories.py"
    spec = importlib.util.spec_from_file_location("category_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def category_pair(tmp_path):
    root = tmp_path / "content"
    canonical, other = root / "ideas/ascii", root / "ideas/中文"
    for folder in (canonical, other):
        folder.mkdir(parents=True)
        (folder / "index.md").write_text("---\ntitle: Same\ncategory_id: example\n---\nSame body", encoding="utf-8")
    return root, canonical, other, tmp_path / "archive"


def snapshot(*folders):
    return {str(p): p.read_bytes() for folder in folders for p in folder.rglob("*") if p.is_file()}


@pytest.mark.parametrize("filename", ["z.bin", "z.md"])
def test_migration_conflict_is_detected_before_any_move(migration, category_pair, filename):
    root, canonical, other, archive = category_pair
    (other / "a.bin").write_bytes(b"must not move early")
    (other / filename).write_bytes(b"new")
    (canonical / filename).write_bytes(b"old")
    before = snapshot(canonical, other)
    for apply in (False, True):
        report = migration.merge_group(root, archive, [canonical, other], apply, "ascii")
        assert report["status"] == "blocked"
        assert snapshot(canonical, other) == before
        assert not archive.exists()


def test_migration_io_failure_restores_both_sides(migration, category_pair, monkeypatch):
    root, canonical, other, archive = category_pair
    (other / "a.bin").write_bytes(b"asset")
    before = snapshot(canonical, other)
    replace = migration.os.replace
    calls = 0

    def fail_second(source, target):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise OSError("injected replacement failure")
        replace(source, target)

    monkeypatch.setattr(migration.os, "replace", fail_second)
    with pytest.raises(OSError, match="injected"):
        migration.merge_group(root, archive, [canonical, other], True, "ascii")
    assert snapshot(canonical, other) == before
    assert (archive / "ideas/ascii/ascii/index.md").is_file()
    assert (archive / "ideas/ascii/中文/a.bin").read_bytes() == b"asset"


def test_migration_preserves_article_slug_and_media(migration, category_pair):
    root, canonical, other, archive = category_pair
    (other / "media").mkdir()
    (other / "media/image.png").write_bytes(b"image")
    (other / "post.md").write_text("---\ntitle: Post\nslug: stable-url\n---\n![pic](./media/image.png)", encoding="utf-8")
    report = migration.merge_group(root, archive, [canonical, other], True, "ascii")
    assert report["status"] == "applied"
    assert not other.exists()
    assert (canonical / "media/image.png").read_bytes() == b"image"
    assert "stable-url" in (canonical / "post.md").read_text(encoding="utf-8")


def test_conflicting_cover_ids_require_decision_without_changes(migration, category_pair):
    root, canonical, other, archive = category_pair
    for folder, media_id in [(canonical, "old-id"), (other, "different-id")]:
        (folder / "index.md").write_text(f"---\ntitle: Same\ncategory_id: example\ncover_media_id: {media_id}\ncover: media/cover.png\n---\nSame body", encoding="utf-8")
    (other / "media").mkdir()
    (other / "media/cover.png").write_bytes(b"ambiguous image")
    before = snapshot(canonical, other)
    report = migration.merge_group(root, archive, [canonical, other], True, "ascii")
    assert report["status"] == "blocked"
    assert snapshot(canonical, other) == before


@pytest.mark.parametrize("incremental", [False, True])
async def test_exception_marks_failure_before_releasing_lock(incremental, mock_container, mock_session, mocker):
    held = False

    @asynccontextmanager
    async def lock():
        nonlocal held
        held = True
        try:
            yield
        finally:
            held = False

    def mark():
        assert held

    mock_container.repository_lock = lock
    mock_container.hash_manager.mark_failed.side_effect = mark
    service = SyncService(mock_session, mock_container)
    method = "_sync_incremental_locked" if incremental else "_sync_all_locked"
    mocker.patch.object(service, method, side_effect=RuntimeError("failed"))
    with pytest.raises(RuntimeError, match="failed"):
        await (service.sync_incremental() if incremental else service.sync_all())
    mock_container.hash_manager.mark_failed.assert_called_once()
    assert not held


@pytest.mark.parametrize("status", ["A", "M", "D"])
async def test_incremental_ignores_documents_before_rename_detection(status, mock_container, mock_session, mock_user, mocker):
    processor = SyncProcessor(mock_container.scanner, mock_container.serializer, mock_container.content_dir)
    process = mocker.patch.object(processor, "process_file_change", new_callable=mocker.AsyncMock)
    names = ["README.md", "AGENTS.md", "ideas/CLAUDE.MDX", "articles/tech/Changelog.md"]
    await processor.reconcile_incremental_sync(mock_session, [(status, name) for name in names], {}, mock_user, SyncStats())
    mock_container.scanner.scan_file.assert_not_called()
    process.assert_not_called()


async def test_cover_hash_identity_and_read_only_preview(tmp_path, mock_session, mocker):
    root = tmp_path / "content"
    for folder, body in [("a", b"first"), ("b", b"second"), ("c", b"first")]:
        directory = root / "ideas" / folder
        directory.mkdir(parents=True)
        (directory / "cover.png").write_bytes(body)
    media = {hashlib.sha256(body).hexdigest(): SimpleNamespace(id=uuid4()) for body in (b"first", b"second")}

    async def lookup(session, content_hash):
        return media.get(content_hash)

    mocker.patch("app.media.crud.get_media_file_by_hash", side_effect=lookup)
    fuzzy = mocker.patch("app.media.service.search_media_files", side_effect=AssertionError("no fuzzy lookup"))
    upload = mocker.patch("app.media.service.create_media_file", side_effect=AssertionError("preview never uploads"))
    resolver = CoverProcessor()
    ids = [await resolver._resolve_cover_media_id(mock_session, "cover.png", f"ideas/{folder}/index.md", root, dry_run=True) for folder in ("a", "b", "c")]
    assert ids[0] == ids[2]
    assert ids[0] != ids[1]
    fuzzy.assert_not_called()
    upload.assert_not_called()
    mock_session.add.assert_not_called()
    mock_session.commit.assert_not_called()


async def test_missing_cover_does_not_guess_by_basename(tmp_path, mock_session, mocker):
    fuzzy = mocker.patch("app.media.service.search_media_files")
    lookup = mocker.patch("app.media.crud.get_media_file_by_path")
    result = await CoverProcessor()._resolve_cover_media_id(mock_session, "cover.png", "ideas/a/index.md", tmp_path)
    assert result is None
    fuzzy.assert_not_called()
    lookup.assert_not_called()


async def test_cover_rejects_sibling_prefix_escape(tmp_path, mock_session, mocker):
    root, sibling = tmp_path / "content", tmp_path / "content-evil"
    root.mkdir()
    sibling.mkdir()
    image = sibling / "cover.png"
    image.write_bytes(b"outside")
    lookup = mocker.patch("app.media.crud.get_media_file_by_hash")
    upload = mocker.patch("app.media.service.create_media_file")
    result = await CoverProcessor()._resolve_cover_media_id(mock_session, str(image), "index.md", root)
    assert result is None
    lookup.assert_not_called()
    upload.assert_not_called()
