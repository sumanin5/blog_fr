"""Repository snapshots guard against accidental writes from import/admin actions."""

import hashlib
import hmac
import json
import subprocess
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import BackgroundTasks
from starlette.requests import Request

from app.git_ops.components.handlers.post_create import handle_post_create
from app.git_ops.components.handlers.post_update import handle_post_update
from app.git_ops.components.hash_manager import HashManager, LAST_SYNC_FILE
from app.git_ops.components.processors.content import ContentProcessor
from app.git_ops.components.scanner import MDXScanner
from app.git_ops.container import GitOpsContainer
from app.git_ops.exceptions import GitOpsReadOnlyError, WebhookSignatureError
from app.git_ops.router import github_webhook, push_to_git
from app.git_ops.schema import SyncStats
from app.git_ops.service import GitOpsService
from app.git_ops.services.sync_service import SyncService
from app.posts.model import Category, Post, PostType
from app.posts.schemas import CategoryCreate, CategoryUpdate, PostCreate, PostUpdate
from app.posts.services import category as category_service
from app.posts.services import post as post_service


def snapshot(root):
    return {p.relative_to(root).as_posix(): p.read_bytes() for p in root.rglob("*") if p.is_file() and ".git" not in p.relative_to(root).parts}


@pytest.fixture
def content_repo(tmp_path):
    root = tmp_path / "content"
    root.mkdir()
    folder = root / "articles" / "tech"
    folder.mkdir(parents=True)
    (folder / "post.md").write_text("---\ntitle: Post\n---\n![pic](./pic.png)\n[Other](./other.md)\n", encoding="utf-8")
    (folder / "index.md").write_text("---\ntitle: Tech\n---\nDescription\n", encoding="utf-8")
    return root


async def test_full_then_incremental_import_keeps_git_clean(content_repo, mock_session, mock_user, mocker):
    def git(*args):
        return subprocess.run(["git", "-c", "user.name=Test", "-c", "user.email=test@example.com", *args], cwd=content_repo, capture_output=True, text=True, check=True).stdout.strip()

    git("init")
    git("add", ".")
    git("commit", "-m", "source content")
    initial_hash = git("rev-parse", "HEAD")
    original = snapshot(content_repo)
    config_before = (content_repo / ".git" / "config").read_bytes()
    container = GitOpsContainer(mock_session, content_repo)
    mocker.patch.object(container.github, "pull", new_callable=mocker.AsyncMock, return_value=("up to date", initial_hash, initial_hash))
    mocker.patch("app.git_ops.services.sync_service.post_crud.get_posts_with_source_path", return_value=[])
    mocker.patch("app.git_ops.services.sync_service.post_crud.get_posts_by_source_paths", return_value=[])
    mocker.patch("app.git_ops.services.sync_service.revalidate_nextjs_cache")
    mocker.patch("app.git_ops.components.processors.content.ContentProcessor._upload_and_get_media_id", return_value=uuid4())
    mocker.patch("app.posts.cruds.post.get_slug_map_by_source_paths", return_value={"articles/tech/other.md": ("other-slug", PostType.ARTICLES)})
    # Exercise the real scanner, import handlers, transformations and reconciliation;
    # database writes are mocked, so no database or network is required.
    async def serialize(scanned):
        data = {"title": "Post", "author_id": uuid4(), "content_mdx": scanned.content}
        await ContentProcessor().process(data, scanned.frontmatter, scanned, mock_session)
        return data

    mocker.patch.object(container.serializer, "from_frontmatter", side_effect=serialize)
    create = mocker.patch("app.posts.services.create_post", return_value=SimpleNamespace(id=uuid4()))
    container.sync_processor.resolve_internal_links_for_posts = mocker.AsyncMock()
    stats = await container.sync_service.sync_all(mock_user)
    assert not stats.errors
    assert create.await_count == 1
    imported = create.call_args.args[1]
    assert "/media/" in imported.content_mdx
    assert "other-slug" in imported.content_mdx
    assert snapshot(content_repo) == original
    assert git("status", "--porcelain") == ""
    assert git("rev-parse", "HEAD") == initial_hash
    assert (content_repo / ".git" / "config").read_bytes() == config_before
    assert (content_repo / ".git" / LAST_SYNC_FILE).read_text() == initial_hash

    # A subsequent committed source change is imported without a writeback commit.
    article = content_repo / "articles/tech/post.md"
    article.write_text(article.read_text(encoding="utf-8") + "New source text\n", encoding="utf-8")
    git("add", ".")
    git("commit", "-m", "update source")
    updated_hash = git("rev-parse", "HEAD")
    original = snapshot(content_repo)
    stats = await container.sync_service.sync_incremental(mock_user)
    assert not stats.errors
    assert create.await_count == 2
    assert snapshot(content_repo) == original
    assert git("status", "--porcelain") == ""
    assert git("rev-parse", "HEAD") == updated_hash


@pytest.mark.parametrize("explicit_slug", [None, "my-fixed-url"])
async def test_create_preserves_source_and_stable_slug(explicit_slug, content_repo, mock_session, mock_user, mocker):
    scanned = await MDXScanner(content_repo).scan_file("articles/tech/post.md")
    serializer = mocker.Mock()
    serializer.from_frontmatter = mocker.AsyncMock(return_value={"title": "Post", "content_mdx": scanned.content, "author_id": uuid4(), "slug": explicit_slug})
    create = mocker.patch("app.posts.services.create_post", return_value=SimpleNamespace(id=uuid4()))
    before = snapshot(content_repo)
    for _ in range(2):
        await handle_post_create(mock_session, scanned, scanned.file_path, serializer, mock_user, content_repo, SyncStats(), set())
    first, second = create.call_args_list
    assert first.args[1].slug == second.args[1].slug
    if explicit_slug:
        assert first.args[1].slug == explicit_slug
    assert first.kwargs["preserve_slug"] is True
    assert first.args[1].source_path == scanned.file_path
    assert snapshot(content_repo) == before


async def test_update_keeps_existing_url_without_metadata_write(content_repo, mock_session, mock_user, mocker):
    scanned = await MDXScanner(content_repo).scan_file("articles/tech/post.md")
    serializer = mocker.Mock()
    serializer.from_frontmatter = mocker.AsyncMock(return_value={"title": "Changed", "slug": "different", "content_mdx": scanned.content})
    update = mocker.patch("app.posts.services.update_post", return_value=SimpleNamespace(id=uuid4()))
    before = snapshot(content_repo)
    await handle_post_update(mock_session, SimpleNamespace(id=uuid4()), scanned, Path(scanned.file_path), False, serializer, mock_user, content_repo, SyncStats(), set())
    assert "slug" not in update.call_args.args[2].model_fields_set
    assert snapshot(content_repo) == before


async def test_admin_post_crud_only_changes_database(
    content_repo, mock_session, mock_user, mocker, monkeypatch
):
    from app.core.config import settings

    monkeypatch.setattr(settings, "CONTENT_DIR", str(content_repo))
    mock_user.id = uuid4()
    before = snapshot(content_repo)
    mocker.patch("app.git_ops.components.writer.writer.FileWriter", side_effect=AssertionError("must not construct a writer"))
    processor = mocker.patch("app.posts.services.post.PostProcessor").return_value
    processor.process = mocker.AsyncMock()
    processor.metadata = {}
    processor.content_mdx = "body"
    processor.content_ast = None
    processor.toc = None
    processor.reading_time = 1
    processor.excerpt = "excerpt"
    post = Post(title="Post", slug="post", author_id=uuid4(), source_path="articles/tech/post.md")
    mocker.patch("app.posts.services.post.crud.get_post_by_id", return_value=post)
    mock_session.delete = mocker.AsyncMock()
    await post_service.create_post(mock_session, PostCreate(title="New", content_mdx="body"), mock_user.id)
    await post_service.update_post(mock_session, post.id, PostUpdate(title="Changed"), mock_user)
    await post_service.delete_post(mock_session, post.id, mock_user)
    mock_session.delete.assert_awaited_once_with(post)
    assert post.source_path == "articles/tech/post.md"
    assert snapshot(content_repo) == before


async def test_admin_category_crud_does_not_move_or_delete_source(
    content_repo, mock_session, mock_user, mocker, monkeypatch
):
    from app.core.config import settings

    monkeypatch.setattr(settings, "CONTENT_DIR", str(content_repo))
    before = snapshot(content_repo)
    mocker.patch("app.git_ops.components.writer.writer.FileWriter", side_effect=AssertionError("must not construct a writer"))
    mocker.patch("app.posts.services.category.crud.get_category_by_slug", return_value=None)
    category = Category(name="Tech", slug="tech", post_type=PostType.ARTICLES)
    mocker.patch("app.posts.services.category.crud.create_category", return_value=category)
    mocker.patch("app.posts.services.category.crud.get_category_by_id", return_value=category)
    async def update(session, existing, values):
        for key, value in values.items():
            setattr(existing, key, value)
        return existing
    mocker.patch("app.posts.services.category.crud.update_category", side_effect=update)
    delete = mocker.patch("app.posts.services.category.crud.delete_category")
    await category_service.create_category(mock_session, CategoryCreate(name="Tech", slug="tech"), mock_user)
    await category_service.update_category(mock_session, category.id, CategoryUpdate(slug="renamed"), mock_user)
    await category_service.delete_category(mock_session, category.id, mock_user)
    delete.assert_awaited_once()
    assert snapshot(content_repo) == before


def test_removed_writeback_methods_do_not_exist():
    from app.git_ops.components.handlers.file_processor import SyncProcessor
    from app.git_ops.components.processors.content import ContentProcessor

    assert not hasattr(SyncProcessor, "sync_categories_to_disk")
    assert not hasattr(ContentProcessor, "_write_transformed_content")


async def test_old_export_entries_are_explicitly_disabled(
    mock_session, mock_container, mocker
):
    mocker.patch(
        "app.git_ops.service.GitOpsContainer", return_value=mock_container
    )
    service = GitOpsService(mock_session)
    for action in [lambda: service.export_to_git(), lambda: service.auto_commit("save")]:
        with pytest.raises(GitOpsReadOnlyError):
            await action()
    with pytest.raises(GitOpsReadOnlyError) as exc:
        await push_to_git(None, mock_session)
    assert exc.value.status_code == 409
    assert exc.value.error_code == "GITOPS_READ_ONLY"


@pytest.mark.parametrize("valid", [True, False])
async def test_webhook_signature_skip_ci_and_retries(valid, mocker):
    secret = "unit-test-secret"
    mocker.patch("app.git_ops.router.settings", SimpleNamespace(WEBHOOK_SECRET=secret))
    run = mocker.patch("app.git_ops.router.run_background_sync", new_callable=mocker.AsyncMock)
    payload = json.dumps({"after": "same-sha", "commits": [{"message": "content [skip ci]"}]}).encode()
    signature = "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    async def receive():
        return {"type": "http.request", "body": payload}
    for _ in range(2):
        tasks = BackgroundTasks()
        request = Request({"type": "http"}, receive)
        if not valid:
            with pytest.raises(WebhookSignatureError):
                await github_webhook(request, tasks, "sha256=bad")
            assert not tasks.tasks
        else:
            assert await github_webhook(request, tasks, signature) == {"status": "triggered"}
            await tasks()
    assert run.await_count == (2 if valid else 0)


async def test_hash_moves_state_outside_source_and_reads_legacy(content_repo, mock_git_client):
    (content_repo / ".git").mkdir()
    legacy = content_repo / LAST_SYNC_FILE
    legacy.write_text("old-hash", encoding="utf-8")
    manager = HashManager(content_repo, mock_git_client)
    assert manager.get_last_hash() == "old-hash"
    await manager.save_current_hash()
    assert legacy.read_text() == "old-hash"
    assert manager.get_last_hash() == "abc123"


async def test_match_post_normalizes_legacy_backslash_path():
    from app.git_ops.components.serializer import PostSerializer

    existing = SimpleNamespace(
        source_path="articles\\tech\\post.md", slug="old-post"
    )
    scanned = SimpleNamespace(
        file_path="articles/tech/post.md", frontmatter={}
    )
    matched, is_move = await PostSerializer(None).match_post(scanned, [existing])
    assert matched is existing
    assert is_move is False


async def test_full_scan_uses_posix_source_paths(content_repo):
    """Windows 全量扫描必须与 Git diff 使用相同的 POSIX source_path。"""
    scanned = await MDXScanner(content_repo).scan_all()
    assert scanned
    assert all("\\" not in item.file_path for item in scanned)
    assert {item.file_path for item in scanned} == {
        "articles/tech/index.md",
        "articles/tech/post.md",
    }


async def test_scan_failure_does_not_delete_existing_post(
    content_repo, mock_session, mock_user, mocker
):
    """解析失败的文件不能被当作已删除，否则全量同步会误删数据库内容。"""
    container = GitOpsContainer(mock_session, content_repo)
    container.scanner.last_scan_errors = {
        "articles/tech/post.md": "invalid frontmatter"
    }
    existing = SimpleNamespace(
        id=uuid4(), source_path="articles/tech/post.md", slug="post"
    )
    delete = mocker.patch(
        "app.git_ops.components.handlers.file_processor.post_service.delete_post"
    )
    stats = SyncStats()
    await container.sync_processor.reconcile_full_sync(
        mock_session,
        {},
        {"articles/tech/post.md": existing},
        mock_user,
        stats,
    )
    delete.assert_not_called()
    assert not stats.deleted


async def test_empty_scan_is_treated_as_incomplete(
    mock_session, mock_container, mock_user, mocker
):
    mock_container.scanner.scan_all = mocker.AsyncMock(return_value=[])
    mock_container.scanner.last_scan_errors = {}
    mock_container.scanner.last_scan_incomplete = False
    mock_container.sync_processor.reconcile_full_sync = mocker.AsyncMock()
    mocker.patch(
        "app.git_ops.services.sync_service.post_crud.get_posts_with_source_path",
        return_value=[
            SimpleNamespace(source_path="articles/tech/post.md", id=uuid4())
        ],
    )
    mocker.patch("app.git_ops.services.sync_service.revalidate_nextjs_cache")
    stats = await SyncService(mock_session, mock_container).sync_all(mock_user)
    assert any(error.code == "SCAN_INCOMPLETE" for error in stats.errors)
    assert mock_container.scanner.last_scan_incomplete is True
    mock_container.hash_manager.save_current_hash.assert_not_awaited()
    mock_container.hash_manager.mark_failed.assert_called_once()


async def test_failed_sync_forces_full_reconciliation_on_retry(
    mock_session, mock_container, mock_user, mocker
):
    mock_container.hash_manager.needs_full_sync.return_value = True
    full_stats = SyncStats()
    full = mocker.patch.object(
        SyncService, "_sync_all_locked", new_callable=mocker.AsyncMock,
        return_value=full_stats,
    )
    result = await SyncService(mock_session, mock_container).sync_incremental(
        mock_user
    )
    assert result is full_stats
    full.assert_awaited_once_with(mock_user)
    mock_container.git_client.pull.assert_not_called()


async def test_scan_failure_keeps_cursor(mock_session, mock_container, mock_user, mocker):
    mock_container.scanner.scan_all = mocker.AsyncMock(return_value=[])
    mock_container.scanner.last_scan_errors = {"articles/tech/bad.md": "bad yaml"}
    mock_container.sync_processor.reconcile_full_sync = mocker.AsyncMock()
    mocker.patch(
        "app.git_ops.services.sync_service.post_crud.get_posts_with_source_path",
        return_value=[],
    )
    mocker.patch("app.git_ops.services.sync_service.revalidate_nextjs_cache")
    stats = await SyncService(mock_session, mock_container).sync_all(mock_user)
    assert stats.errors
    assert stats.errors[0].code == "SCAN_ERROR"
    mock_container.hash_manager.save_current_hash.assert_not_awaited()
