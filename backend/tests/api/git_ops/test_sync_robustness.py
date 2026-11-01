"""
GitOps 同步稳健性：重命名、单文件失败隔离、失败后可重试
"""

import subprocess
from pathlib import Path

import pytest
from app.core.config import settings
from app.posts.model import Post
from httpx import AsyncClient
from sqlmodel import select

SYNC_URL = f"{settings.API_PREFIX}/ops/git/sync"


def _post(slug: str, title: str, author: str, body: str = "正文") -> str:
    return f"""---
title: "{title}"
slug: "{slug}"
author: "{author}"
---

{body}
"""


async def _posts(session) -> list[Post]:
    session.expire_all()
    return list((await session.exec(select(Post))).all())


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_incremental_sync_handles_renamed_file(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    session,
    superadmin_user,
):
    """文章在专栏目录间移动（git 识别为重命名）后，仍是同一篇文章，source_path 跟随更新"""
    (mock_content_dir / "articles" / "py").mkdir(parents=True)
    (mock_content_dir / "articles" / "go").mkdir(parents=True)
    old = mock_content_dir / "articles" / "py" / "moved.md"
    old.write_text(
        _post(
            "moved",
            "Moved",
            superadmin_user.username,
            "足够长的正文，保证 git 能识别为重命名。" * 5,
        ),
        encoding="utf-8",
    )
    git_commit_helper("add")
    assert (
        await async_client.post(
            f"{SYNC_URL}?force_full=true", headers=superadmin_user_token_headers
        )
    ).status_code == 200

    original = next(p for p in await _posts(session) if p.title == "Moved")
    original.view_count = 42
    await session.commit()
    original_id, original_slug = original.id, original.slug

    subprocess.run(
        ["git", "mv", "articles/py/moved.md", "articles/go/moved.md"],
        cwd=mock_content_dir,
        check=True,
    )
    git_commit_helper("move")
    response = await async_client.post(SYNC_URL, headers=superadmin_user_token_headers)
    assert response.status_code == 200, response.text

    matches = [p for p in await _posts(session) if p.title == "Moved"]
    assert len(matches) == 1
    assert matches[0].id == original_id
    assert matches[0].slug == original_slug
    assert matches[0].view_count == 42
    assert matches[0].source_path == "articles/go/moved.md"

    moved = mock_content_dir / "articles/go/moved.md"
    moved.write_text(moved.read_text() + "\n移动后的修改\n", encoding="utf-8")
    git_commit_helper("edit moved file")
    response = await async_client.post(SYNC_URL, headers=superadmin_user_token_headers)
    assert response.status_code == 200, response.text
    matches = [p for p in await _posts(session) if p.title == "Moved"]
    assert len(matches) == 1
    assert (matches[0].id, matches[0].slug, matches[0].view_count) == (
        original_id,
        original_slug,
        42,
    )
    assert "移动后的修改" in matches[0].content_mdx


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_one_bad_file_does_not_block_the_others(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    session,
    superadmin_user,
    mocker,
):
    """同一批次中某个文件处理时触发数据库错误，不应拖垮同批次的其他文件"""
    (mock_content_dir / "seed.md").write_text(
        _post("seed", "Seed", superadmin_user.username), encoding="utf-8"
    )
    git_commit_helper("seed")
    assert (
        await async_client.post(
            f"{SYNC_URL}?force_full=true", headers=superadmin_user_token_headers
        )
    ).status_code == 200

    (mock_content_dir / "aa-bad.md").write_text(
        _post("bad", "Bad", superadmin_user.username), encoding="utf-8"
    )
    (mock_content_dir / "zz-good.md").write_text(
        _post("good", "Good", superadmin_user.username), encoding="utf-8"
    )
    git_commit_helper("batch")

    # 处理 aa-bad.md 时执行一条失败的 SQL，模拟任意数据库错误（约束冲突、超长字段等）
    from sqlalchemy import text

    from app.git_ops.components.handlers import file_processor

    real_create = file_processor.handle_post_create

    async def failing_create(session_, scanned, file_path, *args, **kwargs):
        if str(file_path).endswith("aa-bad.md"):
            await session_.exec(text("SELECT 1/0"))
        return await real_create(session_, scanned, file_path, *args, **kwargs)

    mocker.patch.object(
        file_processor, "handle_post_create", side_effect=failing_create
    )
    response = await async_client.post(SYNC_URL, headers=superadmin_user_token_headers)
    assert response.status_code == 200, response.text
    assert any("aa-bad.md" in e["context"] for e in response.json()["errors"])

    titles = {p.title for p in await _posts(session)}
    assert "Good" in titles
    assert "Bad" not in titles


@pytest.mark.asyncio
@pytest.mark.git_ops
@pytest.mark.parametrize("pull_new_commit", [False, True])
async def test_failed_file_is_retried_on_next_sync(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    session,
    superadmin_user,
    mocker,
    pull_new_commit,
):
    """处理失败的文件不能因为同步进度前移而被永久跳过"""
    (mock_content_dir / "seed.md").write_text(
        _post("seed", "Seed", superadmin_user.username), encoding="utf-8"
    )
    git_commit_helper("seed")
    assert (
        await async_client.post(
            f"{SYNC_URL}?force_full=true", headers=superadmin_user_token_headers
        )
    ).status_code == 200

    (mock_content_dir / "flaky.md").write_text(
        _post("flaky", "Flaky", superadmin_user.username), encoding="utf-8"
    )
    (mock_content_dir / "other.md").write_text(
        _post("other", "Other", superadmin_user.username), encoding="utf-8"
    )
    git_commit_helper("add flaky")
    hash_file = mock_content_dir / ".gitops_last_sync"
    successful_hash = hash_file.read_text()

    # 第一次同步：flaky.md 处理时发生一次性故障（如网络/磁盘抖动）
    from app.git_ops.components.handlers import file_processor

    real_create = file_processor.handle_post_create

    async def flaky_create(session_, scanned, file_path, *args, **kwargs):
        if str(file_path).endswith("flaky.md"):
            raise RuntimeError("transient failure")
        return await real_create(session_, scanned, file_path, *args, **kwargs)

    mocker.patch.object(file_processor, "handle_post_create", side_effect=flaky_create)
    first = await async_client.post(SYNC_URL, headers=superadmin_user_token_headers)
    assert first.status_code == 200, first.text
    assert first.json()["errors"]
    assert hash_file.read_text() == successful_hash
    other = next(p for p in await _posts(session) if p.title == "Other")
    other_identity = (other.id, other.slug)
    mocker.patch.object(file_processor, "handle_post_create", side_effect=real_create)

    # 第二次同步：pull 又带来新提交，仍须覆盖上次失败的提交区间。
    from app.git_ops.components.github import GitHubComponent

    real_pull = GitHubComponent.pull

    async def pull_with_new_commit(github):
        before = await github.git_client.get_current_hash()
        (mock_content_dir / "latest.md").write_text(
            _post("latest", "Latest", "superadmin_user"), encoding="utf-8"
        )
        git_commit_helper("new commit during pull")
        output, _, after = await real_pull(github)
        return output, before, after

    if pull_new_commit:
        mocker.patch.object(GitHubComponent, "pull", new=pull_with_new_commit)
    response = await async_client.post(SYNC_URL, headers=superadmin_user_token_headers)
    assert response.status_code == 200, response.text
    assert response.json()["errors"] == []

    posts = await _posts(session)
    assert "Flaky" in {p.title for p in posts}
    if pull_new_commit:
        assert "Latest" in {p.title for p in posts}
    others = [p for p in posts if p.title == "Other"]
    assert len(others) == 1
    assert (others[0].id, others[0].slug) == other_identity
    assert hash_file.read_text() != successful_hash


@pytest.mark.asyncio
@pytest.mark.git_ops
@pytest.mark.parametrize("operation", ["sync?force_full=true", "sync", "push"])
async def test_sync_waits_for_lock_held_by_another_process(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    superadmin_user,
    db_engine,
    operation,
):
    """
    生产环境是多 worker 进程，进程内的 asyncio.Lock 无法互斥。
    同步锁必须是跨进程的（Postgres advisory lock）：另一个连接持有锁时，同步应等待，释放后再完成。
    """
    import asyncio

    from sqlalchemy import text

    from app.git_ops.services.sync_service import SYNC_ADVISORY_LOCK_KEY

    (mock_content_dir / "locked.md").write_text(
        _post("locked", "Locked", superadmin_user.username), encoding="utf-8"
    )
    git_commit_helper("add locked")
    # 为增量同步建立起点，避免把缺失进度误判为锁失败。
    if operation == "sync":
        initial_hash = subprocess.check_output(
            ["git", "rev-parse", "HEAD^"], cwd=mock_content_dir, text=True
        ).strip()
        (mock_content_dir / ".gitops_last_sync").write_text(initial_hash)

    # 用独立连接模拟另一个 worker 进程持有同步锁
    async with db_engine.connect() as other_worker:
        await other_worker.execute(
            text("SELECT pg_advisory_lock(:key)"), {"key": SYNC_ADVISORY_LOCK_KEY}
        )
        sync_task = asyncio.create_task(
            async_client.post(
                f"{settings.API_PREFIX}/ops/git/{operation}",
                headers=superadmin_user_token_headers,
            )
        )
        await asyncio.sleep(1.5)
        assert not sync_task.done(), "另一个进程持有同步锁时，同步不应开始执行"

        await other_worker.execute(
            text("SELECT pg_advisory_unlock(:key)"), {"key": SYNC_ADVISORY_LOCK_KEY}
        )

    response = await asyncio.wait_for(sync_task, timeout=30)
    assert response.status_code == 200, response.text


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_webhook_mixed_push_with_skip_ci_commit_still_syncs(
    async_client: AsyncClient,
    monkeypatch,
    mocker,
):
    """一次推送中只要有一个非自动提交，就必须触发同步；只有全部提交都带 [skip ci] 时才跳过"""
    import hashlib
    import hmac
    import json

    from app.git_ops.router import _recent_webhook_commits

    _recent_webhook_commits.clear()
    secret = "test_webhook_secret"
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", secret)
    mock_bg_sync = mocker.patch("app.git_ops.router.run_background_sync")

    payload = json.dumps(
        {
            "ref": "refs/heads/main",
            "after": "human456",
            "head_commit": {"id": "human456", "message": "docs: 新增一篇文章"},
            "commits": [
                {
                    "id": "auto123",
                    "message": "chore: sync metadata from database (+1) [skip ci]",
                },
                {"id": "human456", "message": "docs: 新增一篇文章"},
            ],
        }
    ).encode()
    signature = (
        "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    )

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/webhook",
        content=payload,
        headers={"X-Hub-Signature-256": signature, "Content-Type": "application/json"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "triggered"
    mock_bg_sync.assert_called_once()


@pytest.mark.parametrize("force_full", [False, True])
async def test_failure_after_frontmatter_write_rolls_back_file_and_stats(
    async_client,
    superadmin_user_token_headers,
    mock_content_dir,
    git_commit_helper,
    session,
    superadmin_user,
    mocker,
    force_full,
):
    """处理器已写盘、添加统计后发生 SQL 错误，数据库和统计都必须回滚。"""
    import frontmatter
    from sqlalchemy import text
    from app.git_ops.components.handlers import file_processor

    headers = superadmin_user_token_headers
    (mock_content_dir / "seed.md").write_text(
        _post("seed", "Seed", superadmin_user.username), encoding="utf-8"
    )
    git_commit_helper("seed")
    assert (
        await async_client.post(f"{SYNC_URL}?force_full=true", headers=headers)
    ).status_code == 200
    hash_file = mock_content_dir / ".gitops_last_sync"
    successful_hash = hash_file.read_text()
    for name in ("aa-bad", "zz-good"):
        (mock_content_dir / f"{name}.md").write_text(
            _post(name, name, superadmin_user.username), encoding="utf-8"
        )
    git_commit_helper("batch")
    real_create = file_processor.handle_post_create

    async def fail_after_write(session_, scanned, file_path, *args, **kwargs):
        result = await real_create(session_, scanned, file_path, *args, **kwargs)
        if file_path == "aa-bad.md":
            await session_.exec(text("SELECT 1/0"))
        return result

    patched = mocker.patch.object(
        file_processor, "handle_post_create", side_effect=fail_after_write
    )
    url = f"{SYNC_URL}?force_full={str(force_full).lower()}"
    response = await async_client.post(url, headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert len(data["errors"]) == 1
    assert "aa-bad.md" not in data["added"] + data["updated"] + data["deleted"]
    assert "zz-good.md" in data["added"]
    assert "aa-bad" not in {p.title for p in await _posts(session)}
    assert hash_file.read_text() == successful_hash
    assert frontmatter.load(mock_content_dir / "aa-bad.md").get("slug")

    patched.side_effect = real_create
    response = await async_client.post(url, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["errors"] == []
    posts = await _posts(session)
    assert sum(p.title == "aa-bad" for p in posts) == 1
    assert sum(p.title == "zz-good" for p in posts) == 1
    failed_post = next(p for p in posts if p.title == "aa-bad")
    assert frontmatter.load(mock_content_dir / "aa-bad.md")["slug"] == failed_post.slug


@pytest.mark.parametrize("force_full", [False, True])
async def test_slug_recovers_move_even_when_git_reports_add_and_delete(
    async_client,
    superadmin_user_token_headers,
    mock_content_dir,
    git_commit_helper,
    session,
    superadmin_user,
    mocker,
    force_full,
):
    """全量同步及 A+D 均按稳定 slug 找回文章，移动失败时保留旧记录。"""
    from sqlalchemy import text
    from app.git_ops.components.handlers import file_processor

    headers = superadmin_user_token_headers
    source = mock_content_dir / "old.md"
    source.write_text(
        _post("stable", "Stable", superadmin_user.username), encoding="utf-8"
    )
    git_commit_helper("seed")
    assert (
        await async_client.post(f"{SYNC_URL}?force_full=true", headers=headers)
    ).status_code == 200
    original = (await _posts(session))[0]
    original_id, original_slug = original.id, original.slug
    source.rename(mock_content_dir / "new.md")
    git_commit_helper("move")
    if not force_full:
        mocker.patch(
            "app.git_ops.git_client.GitClient.get_changed_files_with_status",
            return_value=[("D", "old.md"), ("A", "new.md")],
        )
    real_update = file_processor.handle_post_update

    async def fail_update(session_, *args, **kwargs):
        await real_update(session_, *args, **kwargs)
        await session_.exec(text("SELECT 1/0"))

    patched = mocker.patch.object(
        file_processor, "handle_post_update", side_effect=fail_update
    )
    url = f"{SYNC_URL}?force_full={str(force_full).lower()}"
    response = await async_client.post(url, headers=headers)
    if force_full:
        # 全量同步仍会处理分类索引；失败的移动不能留下成功统计或触发删除。
        assert response.status_code == 200, response.text
        assert len(response.json()["errors"]) == 1
        assert "new.md" not in response.json()["updated"]
        assert response.json()["deleted"] == []
    else:
        # 增量批次中唯一的变更失败、没有任何成功操作：按既有约定返回 400
        # （同 test_sync_author）；分类索引内容未变，不再被误记为 updated。
        assert response.status_code == 400, response.text
        assert "SELECT 1/0" in response.text
    posts = await _posts(session)
    assert len(posts) == 1
    assert (posts[0].id, posts[0].slug, posts[0].source_path) == (
        original_id,
        original_slug,
        "old.md",
    )

    patched.side_effect = real_update
    response = await async_client.post(url, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["errors"] == []
    posts = await _posts(session)
    assert len(posts) == 1
    assert (posts[0].id, posts[0].slug, posts[0].source_path) == (
        original_id,
        original_slug,
        "new.md",
    )


@pytest.mark.parametrize(
    "message,expected",
    [
        ("auto [skip ci]", "skipped"),
        ("auto [ci skip]", "skipped"),
        ("human edit", "triggered"),
    ],
)
@pytest.mark.parametrize("commits", [None, []])
async def test_webhook_uses_head_commit_when_commits_are_empty(
    async_client,
    monkeypatch,
    mocker,
    message,
    expected,
    commits,
):
    import hashlib
    import hmac
    import json
    from app.git_ops.router import _recent_webhook_commits

    _recent_webhook_commits.clear()
    secret = "test_webhook_secret"
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", secret)
    background = mocker.patch("app.git_ops.router.run_background_sync")
    data = {"head_commit": {"id": "head-only", "message": message}}
    if commits is not None:
        data["commits"] = commits
    payload = json.dumps(data).encode()
    signature = (
        "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    )
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/webhook",
        content=payload,
        headers={"X-Hub-Signature-256": signature},
    )
    assert response.status_code == 200
    assert response.json()["status"] == expected
    assert background.call_count == int(expected == "triggered")
    if expected == "skipped":
        assert response.json()["reason"] == "automated commit with [skip ci]"
        assert "head-only" not in _recent_webhook_commits


@pytest.mark.parametrize("cancel", [False, True])
async def test_repository_lock_is_released_after_failure(session, db_engine, cancel):
    import asyncio
    from contextlib import suppress
    from sqlalchemy import text
    from app.git_ops.services.sync_service import SyncService, SYNC_ADVISORY_LOCK_KEY

    entered = asyncio.Event()

    async def fail():
        async with SyncService.repository_lock(session):
            entered.set()
            if cancel:
                await asyncio.Event().wait()
            raise RuntimeError("failure while holding lock")

    task = asyncio.create_task(fail())
    await asyncio.wait_for(entered.wait(), 5)
    if cancel:
        task.cancel()
    with suppress(asyncio.CancelledError, RuntimeError):
        await task
    async with db_engine.connect() as connection:
        acquired = await connection.scalar(
            text("SELECT pg_try_advisory_lock(:key)"), {"key": SYNC_ADVISORY_LOCK_KEY}
        )
        try:
            assert acquired is True
        finally:
            if acquired:
                await connection.execute(
                    text("SELECT pg_advisory_unlock(:key)"),
                    {"key": SYNC_ADVISORY_LOCK_KEY},
                )


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_background_commit_waits_for_repository_lock(
    mock_content_dir: Path, db_engine, mocker
):
    """后台保存触发的 git pull/commit/push 必须与同步共用跨进程锁"""
    import asyncio

    from sqlalchemy import text

    from app.git_ops.background_tasks import run_background_commit
    from app.git_ops.schema import SyncStats
    from app.git_ops.services.sync_service import SYNC_ADVISORY_LOCK_KEY

    mocker.patch(
        "app.git_ops.service.GitOpsService.export_to_git", return_value=SyncStats()
    )
    git_add = mocker.patch("app.git_ops.git_client.GitClient.add")
    git_commit = mocker.patch("app.git_ops.git_client.GitClient.commit")

    async with db_engine.connect() as other_worker:
        await other_worker.execute(
            text("SELECT pg_advisory_lock(:key)"), {"key": SYNC_ADVISORY_LOCK_KEY}
        )
        task = asyncio.create_task(
            run_background_commit(message="Update post", force_commit=True)
        )
        await asyncio.sleep(1.5)
        assert not task.done()
        git_add.assert_not_called()
        git_commit.assert_not_called()

        await other_worker.execute(
            text("SELECT pg_advisory_unlock(:key)"), {"key": SYNC_ADVISORY_LOCK_KEY}
        )

    await asyncio.wait_for(task, timeout=30)
    git_commit.assert_called_once_with("Update post")


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_export_commits_inside_lock_without_deadlock(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    created_article_post,
    mocker,
):
    """导出在持锁状态下提交：不能再次获取同一把（不可重入的）锁而自我阻塞"""
    import asyncio

    git_commit = mocker.patch("app.git_ops.git_client.GitClient.commit")
    # 创建文章时已写盘；删除文件让导出判定“数据库有、磁盘无”，从而真正导出并提交
    for markdown in mock_content_dir.rglob("*.md"):
        if markdown.name != "index.md":
            markdown.unlink()

    response = await asyncio.wait_for(
        async_client.post(
            f"{settings.API_PREFIX}/ops/git/push",
            headers=superadmin_user_token_headers,
        ),
        timeout=30,
    )

    assert response.status_code == 200, response.text
    assert response.json()["updated"]
    git_commit.assert_called_once()


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_retry_does_not_report_unchanged_files_or_refresh_cache(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    superadmin_user,
    mocker,
):
    """存在永久失败的文件时，重放的批次中未变化的文章与分类索引不应计入 updated，也不应刷新缓存"""
    (mock_content_dir / "seed.md").write_text(
        _post("seed", "Seed", superadmin_user.username), encoding="utf-8"
    )
    git_commit_helper("seed")
    assert (
        await async_client.post(
            f"{SYNC_URL}?force_full=true", headers=superadmin_user_token_headers
        )
    ).status_code == 200

    (mock_content_dir / "good.md").write_text(
        _post("good", "Good", superadmin_user.username), encoding="utf-8"
    )
    (mock_content_dir / "broken.md").write_text(
        _post("broken", "Broken", superadmin_user.username), encoding="utf-8"
    )
    git_commit_helper("add good and broken")

    from app.git_ops.components.handlers import file_processor

    real_create = file_processor.handle_post_create

    async def always_fail(session_, scanned, file_path, *args, **kwargs):
        if str(file_path).endswith("broken.md"):
            raise RuntimeError("permanent failure")
        return await real_create(session_, scanned, file_path, *args, **kwargs)

    mocker.patch.object(file_processor, "handle_post_create", side_effect=always_fail)
    revalidate = mocker.patch(
        "app.git_ops.services.sync_service.revalidate_nextjs_cache"
    )

    first = await async_client.post(SYNC_URL, headers=superadmin_user_token_headers)
    assert first.status_code == 200, first.text
    assert "good.md" in first.json()["added"]
    assert revalidate.call_count == 1

    second = await async_client.post(SYNC_URL, headers=superadmin_user_token_headers)
    # 只剩永久失败的文件：没有任何实际变更，按既有约定返回 400
    assert second.status_code == 400, second.text
    assert "permanent failure" in second.text
    assert revalidate.call_count == 1
