import importlib.util
from pathlib import Path
import shutil

from app.core.config import settings
from app.git_ops.content_contract import validate, working_files
from app.git_ops.services.sync_service import SyncService
from app.git_ops.components.scanner import MDXScanner


PROJECT = Path(__file__).resolve().parents[4]


def load_setup():
    spec = importlib.util.spec_from_file_location(
        "setup_local_content", PROJECT / "scripts/setup_local_content.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.configure


def project_at(tmp_path):
    project = tmp_path / "project"
    (project / "backend").mkdir(parents=True)
    shutil.copytree(PROJECT / "content-template", project / "content-template")
    return project


def test_missing_external_content_uses_shipped_template_without_git(tmp_path):
    project = project_at(tmp_path)
    selected = load_setup()(project, Path("../missing-content"))
    assert selected == project / "content"
    assert not (selected / ".git").exists()
    assert validate(working_files(selected)) == []
    assert (selected / "articles/示例专栏/index.md").exists()


def test_existing_external_directory_and_other_settings_are_preserved(tmp_path):
    from dotenv import dotenv_values

    project = project_at(tmp_path)
    external = tmp_path / "my content #1"
    external.mkdir()
    (external / "notes.txt").write_text("keep me", encoding="utf-8")
    env = project / "backend/.env.local"
    env.write_text("DATABASE_URL=keep-existing-value\nCONTENT_DIR=old\n", encoding="utf-8")
    setup = load_setup()
    setup(project, external)
    first = env.read_bytes()
    setup(project, external)
    assert env.read_bytes() == first
    values = dotenv_values(env)
    assert values["CONTENT_DIR"] == external.as_posix()
    assert values["DATABASE_URL"] == "keep-existing-value"
    assert values["GIT_PULL_BEFORE_SYNC"] == "false"
    assert values["ENABLE_GIT_AUTO_SYNC"] == "false"
    assert (external / "notes.txt").read_text(encoding="utf-8") == "keep me"
    assert not (project / "content").exists()


def test_default_keeps_existing_project_content(tmp_path):
    project = project_at(tmp_path)
    content = project / "content"
    content.mkdir()
    (content / "README.md").write_text("my existing content", encoding="utf-8")
    load_setup()(project)
    assert (content / "README.md").read_text(encoding="utf-8") == "my existing content"
    assert not (content / "articles").exists()


async def test_offline_import_scans_worktree_without_pull_or_commit_cursor(
    tmp_path, mocker, mock_container, mock_session, mock_user
):
    mocker.patch.object(settings, "GIT_PULL_BEFORE_SYNC", False)
    mock_container.content_dir = tmp_path
    folder = tmp_path / "ideas/中文分类"
    folder.mkdir(parents=True)
    (folder / "index.md").write_text(
        "---\ntitle: Category\nslug: category\n---\nDescription", encoding="utf-8"
    )
    (folder / "新文章.md").write_text(
        "---\ntitle: Local draft\nslug: local-draft\n---\nUnsaved to Git", encoding="utf-8"
    )
    mock_container.scanner = MDXScanner(tmp_path)
    mock_container.sync_processor.reconcile_full_sync = mocker.AsyncMock()
    mocker.patch(
        "app.git_ops.services.sync_service.post_crud.get_posts_with_source_path",
        new_callable=mocker.AsyncMock,
        return_value=[],
    )
    service = SyncService(mock_session, mock_container)
    mocker.patch.object(service, "_get_operating_user", return_value=mock_user)
    await service._sync_incremental_locked(mock_user, "old-commit", "new-commit")
    mock_container.github.pull.assert_not_awaited()
    mock_container.sync_processor.reconcile_full_sync.assert_awaited_once()
    scanned = mock_container.sync_processor.reconcile_full_sync.call_args.args[1]
    assert scanned["ideas/中文分类/新文章.md"].content.strip() == "Unsaved to Git"
    mock_container.hash_manager.save_current_hash.assert_not_awaited()
    mock_container.hash_manager.get_changed_files_since_last_sync.assert_not_awaited()
    mock_container.git_client.get_current_hash.assert_not_awaited()


async def test_remote_import_still_pulls_by_default(mocker, mock_container, mock_session):
    mocker.patch.object(settings, "GIT_PULL_BEFORE_SYNC", True)
    mock_container.hash_manager.get_changed_files_since_last_sync.return_value = []
    await SyncService(mock_session, mock_container)._sync_incremental_locked()
    mock_container.github.pull.assert_awaited_once()
