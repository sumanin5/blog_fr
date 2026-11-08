import hashlib
import hmac
import json
import shutil
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import BackgroundTasks
from starlette.requests import Request

from app.git_ops.content_contract import MANIFEST, staged_files, validate
from app.git_ops.components.processors.category import CategoryProcessor
from app.git_ops.components.scanner import MDXScanner
from app.git_ops.components.handlers.file_processor import SyncProcessor
from app.git_ops.schema import SyncStats
from app.git_ops.container import GitOpsContainer
from app.git_ops.exceptions import GitOpsSyncError
from app.git_ops.router import github_webhook
from app.git_ops.services.sync_service import SyncService

REPO = Path(__file__).resolve().parents[4]


def document(slug, title="Title"):
    return f"---\ntitle: {title}\nslug: {slug}\n---\nBody\n"


def valid_files():
    return {"ideas/中文专栏/index.md": document("stable-category"),
            "ideas/中文专栏/中文文章.md": document("stable-article")}


def test_chinese_names_and_explicit_urls_are_independent():
    files = valid_files()
    assert validate(files) == []
    assert validate({name.replace("中文专栏", "改名后的专栏"): text for name, text in files.items()}) == []


@pytest.mark.parametrize("variant", ["category", "article", "reserved", "missing", "invalid", "duplicate-yaml", "missing-index"])
def test_invalid_links_are_rejected_with_paths(variant):
    files = valid_files()
    if variant == "category":
        files["ideas/另一个目录/index.md"] = document("stable-category")
    elif variant == "article":
        files["articles/其他/index.md"] = document("other")
        files["articles/其他/article.md"] = document("stable-article")
    elif variant == "reserved":
        files["ideas/中文专栏/中文文章.md"] = document("categories")
    elif variant == "missing":
        files["ideas/中文专栏/中文文章.md"] = "---\ntitle: No slug\n---\nBody"
    elif variant == "invalid":
        files["ideas/中文专栏/中文文章.md"] = document("Bad_Slug")
    elif variant == "duplicate-yaml":
        files["ideas/中文专栏/中文文章.md"] = "---\nslug: one\nslug: two\n---\nBody"
    else:
        del files["ideas/中文专栏/index.md"]
    errors = validate(files)
    assert errors
    assert any(".md" in error for error in errors)


def test_descriptive_files_never_become_content():
    files = valid_files()
    for name in ["README.md", "AGENTS.md", "ideas/CLAUDE.MDX", ".agent/notes.md"]:
        files[name] = "No slug; documentation only"
    assert validate(files) == []


def test_native_hook_blocks_staged_conflict_even_if_working_copy_is_fixed(tmp_path):
    def git(*args, check=True):
        return subprocess.run(["git", "-c", "user.name=Test", "-c", "user.email=test@example.invalid", *args], cwd=tmp_path, capture_output=True, check=check)

    git("init")
    for name, text in valid_files().items():
        path = tmp_path / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    # Install exactly the same artifact used by the content clone, without app imports.
    tools = tmp_path / "tools"
    hooks = tmp_path / ".githooks"
    tools.mkdir()
    hooks.mkdir()
    shutil.copyfile(REPO / "backend/app/git_ops/content_contract.py", tools / "content_contract.py")
    (hooks / "pre-commit").write_bytes((REPO / "scripts/content-hooks/pre-commit").read_bytes().replace(b"\r\n", b"\n"))
    (hooks / "pre-commit").chmod(0o755)
    git("config", "core.hooksPath", ".githooks")
    git("config", "content.python", sys.executable)
    git("add", ".")
    git("commit", "-m", "Valid content")
    original = git("rev-parse", "HEAD").stdout
    duplicate = tmp_path / "ideas/中文专栏/another.md"
    duplicate.write_text(document("stable-article"), encoding="utf-8")
    git("add", ".")
    duplicate.write_text(document("fixed-but-not-staged"), encoding="utf-8")
    files = staged_files(tmp_path)
    assert validate(files)
    rejected = git("commit", "-m", "Must reject duplicate", check=False)
    assert rejected.returncode != 0
    assert b"duplicate slug" in rejected.stderr
    assert git("rev-parse", "HEAD").stdout == original
    git("add", ".")
    git("commit", "-m", "Fixed staged content")


async def test_scanner_reads_category_slug_from_index_for_every_article(tmp_path):
    (tmp_path / MANIFEST).write_text('{"version": 1}', encoding="utf-8")
    for name, text in valid_files().items():
        path = tmp_path / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    scanned = await MDXScanner(tmp_path).scan_all()
    assert len(scanned) == 2
    assert all(item.derived_category_slug == "stable-category" for item in scanned)
    assert all(item.category_slug_explicit for item in scanned)


async def test_explicit_category_beats_stale_database_id(mock_session, mocker):
    stale, expected = uuid4(), uuid4()
    processor = CategoryProcessor()
    lookup = mocker.patch("app.posts.cruds.get_category_by_id")
    resolve = mocker.patch.object(processor, "_resolve_category_id", return_value=expected)
    data = {"category_id": stale, "post_type": "ideas"}
    scanned = SimpleNamespace(category_slug_explicit=True, derived_category_slug="stable-category")
    await processor.process(data, {}, scanned, mock_session)
    lookup.assert_not_called()
    assert resolve.call_args.args[1] == "stable-category"
    assert data["category_id"] == expected


async def test_contract_failure_happens_before_scan_or_database_changes(tmp_path, mock_session, mock_user, mocker):
    (tmp_path / MANIFEST).write_text('{"version": 1}', encoding="utf-8")
    files = valid_files()
    files["ideas/中文专栏/another.md"] = document("stable-article")
    for name, text in files.items():
        path = tmp_path / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    container = GitOpsContainer(mock_session, tmp_path)
    container.github.pull = mocker.AsyncMock(return_value=("local", "old", "new"))
    scan = mocker.spy(container.scanner, "scan_all")
    with pytest.raises(GitOpsSyncError, match="validation failed"):
        await container.sync_service.sync_all(mock_user)
    scan.assert_not_called()
    mock_session.execute.assert_not_called()
    mock_session.commit.assert_not_called()


async def test_document_only_diff_does_not_query_or_write_database(mock_container, mock_session, mocker):
    mock_container.hash_manager.get_changed_files_since_last_sync.return_value = [("M", "README.md"), ("M", "AGENTS.md")]
    user = mocker.patch("app.users.crud.get_superuser", side_effect=AssertionError("documentation needs no user"))
    await SyncService(mock_session, mock_container).sync_incremental()
    user.assert_not_called()
    mock_session.execute.assert_not_called()
    mock_session.commit.assert_not_called()
    mock_container.hash_manager.save_current_hash.assert_awaited_once()


async def test_article_paths_are_updated_before_category_links(mock_container, mock_session, mock_user, mocker):
    processor = SyncProcessor(mock_container.scanner, mock_container.serializer, mock_container.content_dir)
    process = mocker.patch.object(processor, "process_scanned_file", new_callable=mocker.AsyncMock)
    files = {"ideas/中文/index.md": SimpleNamespace(is_category_index=True, frontmatter={}),
             "ideas/中文/post.md": SimpleNamespace(is_category_index=False, frontmatter={})}
    await processor.reconcile_full_sync(mock_session, files, {}, mock_user, SyncStats())
    assert [call.args[2].is_category_index for call in process.call_args_list] == [False, True]


@pytest.mark.parametrize("event,ref", [("ping", "refs/heads/main"), ("push", "refs/heads/feature")])
async def test_other_webhooks_never_schedule_import(event, ref, mocker):
    secret = "test-secret"
    mocker.patch("app.git_ops.router.settings", SimpleNamespace(WEBHOOK_SECRET=secret, GIT_SYNC_BRANCH="main"))
    run = mocker.patch("app.git_ops.router.run_background_sync")
    payload = json.dumps({"ref": ref}).encode()

    async def receive():
        return {"type": "http.request", "body": payload}

    request = Request({"type": "http", "headers": [(b"x-github-event", event.encode())]}, receive)
    signature = "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    tasks = BackgroundTasks()
    assert (await github_webhook(request, tasks, signature))["status"] == "skipped"
    assert not tasks.tasks
    run.assert_not_called()
