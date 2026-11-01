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
    assert matches[0].id == original.id
    assert matches[0].source_path == "articles/go/moved.md"


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
async def test_failed_file_is_retried_on_next_sync(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    session,
    superadmin_user,
    mocker,
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

    # 第一次同步：flaky.md 处理时发生一次性故障（如网络/磁盘抖动）
    from app.git_ops.components.handlers import file_processor

    real_create = file_processor.handle_post_create

    async def flaky_create(session_, scanned, file_path, *args, **kwargs):
        if str(file_path).endswith("flaky.md"):
            raise RuntimeError("transient failure")
        return await real_create(session_, scanned, file_path, *args, **kwargs)

    mocker.patch.object(file_processor, "handle_post_create", side_effect=flaky_create)
    await async_client.post(SYNC_URL, headers=superadmin_user_token_headers)
    mocker.patch.object(file_processor, "handle_post_create", side_effect=real_create)

    # 第二次同步：故障已消失，没有新提交，flaky.md 也应被补上
    response = await async_client.post(SYNC_URL, headers=superadmin_user_token_headers)
    assert response.status_code in (200, 400, 500), response.text

    titles = {p.title for p in await _posts(session)}
    assert "Flaky" in titles


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_sync_waits_for_lock_held_by_another_process(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    git_commit_helper,
    superadmin_user,
    db_engine,
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

    # 用独立连接模拟另一个 worker 进程持有同步锁
    async with db_engine.connect() as other_worker:
        await other_worker.execute(
            text("SELECT pg_advisory_lock(:key)"), {"key": SYNC_ADVISORY_LOCK_KEY}
        )
        sync_task = asyncio.create_task(
            async_client.post(
                f"{SYNC_URL}?force_full=true", headers=superadmin_user_token_headers
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
