"""单元测试：事件驱动型本地内容变更预检与推送接口（方案 1）。"""

from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.core.db import get_async_session
from app.git_ops import watcher
from app.git_ops.schema import SyncStats
from app.git_ops.watch_planner import collect_contract_files, scan_snapshot
from app.main import app


@pytest.mark.unit
@pytest.mark.git_ops
@pytest.mark.parametrize(
    ("environment", "flag", "expected"),
    [
        ("local", True, True),
        ("development", True, True),
        ("test", True, True),
        ("local", False, False),
        ("development", False, False),
        ("production", True, False),
        ("production", False, False),
    ],
)
def test_is_local_event_push_enabled_blocks_production(
    environment: str, flag: bool, expected: bool
):
    """生产环境无论开关与否必须强制禁用，非生产环境受 ENABLE_LOCAL_CONTENT_WATCHER 控制。"""
    fake_settings = SimpleNamespace(
        environment=environment,
        ENABLE_LOCAL_CONTENT_WATCHER=flag,
    )
    assert watcher.is_local_event_push_enabled(fake_settings) is expected


@pytest.mark.unit
@pytest.mark.git_ops
def test_scan_snapshot_and_contract_collection_prune_dot_and_tool_dirs(tmp_path: Path):
    """契约与目录扫描跳过 .git/.agent/.obsidian 与 tools，仅纳入有效文章树。"""
    (tmp_path / ".git").mkdir()
    (tmp_path / ".git" / "index").write_text("git-index", encoding="utf-8")
    (tmp_path / ".agent" / "skills").mkdir(parents=True)
    (tmp_path / ".agent" / "skills" / "SKILL.md").write_text("skill", encoding="utf-8")
    (tmp_path / "tools").mkdir()
    (tmp_path / "tools" / "check.md").write_text("tool-doc", encoding="utf-8")

    cat_dir = tmp_path / "ideas" / "比特漫笔"
    cat_dir.mkdir(parents=True)
    (cat_dir / "index.md").write_text("---\ntitle: Cat\nslug: cat\n---\n", encoding="utf-8")
    (cat_dir / "post.mdx").write_text("---\ntitle: Post\nslug: post\n---\n", encoding="utf-8")
    (cat_dir / "AGENTS.md").write_text("guide", encoding="utf-8")

    snap = scan_snapshot(tmp_path)
    assert ".git/index" not in snap
    assert ".agent/skills/SKILL.md" not in snap
    assert "tools/check.md" not in snap
    assert "ideas/比特漫笔/index.md" in snap
    assert "ideas/比特漫笔/post.mdx" in snap

    contract_files = collect_contract_files(tmp_path)
    assert set(contract_files) == {
        "ideas/比特漫笔/index.md",
        "ideas/比特漫笔/post.mdx",
    }


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_process_local_content_events_gates_on_prechecks_and_routes_sync(
    tmp_path: Path, mocker
):
    """验证事件处理器：非文章跳过、契约/MDX 422 拦截、前端不可达降级与定向/全量路由。"""
    cat_dir = tmp_path / "ideas" / "cat"
    cat_dir.mkdir(parents=True)

    mock_session = mocker.MagicMock()
    mock_service_cls = mocker.patch("app.git_ops.watcher.GitOpsService")
    fake_settings = SimpleNamespace(
        FRONTEND_URL="http://frontend:3000",
        REVALIDATE_SECRET="secret",
    )

    # 1. 非文章文档变动直接 skipped
    skipped = await watcher.process_local_content_events(
        mock_session,
        tmp_path,
        [("M", "AGENTS.md")],
        app_settings=fake_settings,
    )
    assert skipped.status == "skipped"
    mock_service_cls.assert_not_called()

    # 2. 缺少分类 index.md -> contract 拦截，不触碰数据库
    (cat_dir / "post.mdx").write_text(
        "---\ntitle: Post\nslug: post\n---\n<UnknownTag />",
        encoding="utf-8",
    )
    blocked_contract = await watcher.process_local_content_events(
        mock_session,
        tmp_path,
        [("M", "ideas/cat/post.mdx")],
        app_settings=fake_settings,
    )
    assert blocked_contract.status == "blocked"
    assert blocked_contract.stage == "contract"
    mock_service_cls.assert_not_called()

    # 3. 补齐 index.md 后契约通过，前端 /api/mdx-precheck 返回 422 -> mdx 拦截
    (cat_dir / "index.md").write_text(
        "---\ntitle: Cat\nslug: cat\n---\n", encoding="utf-8"
    )
    mock_client = mocker.MagicMock()
    mock_client.__aenter__ = mocker.AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = mocker.AsyncMock(return_value=None)
    mock_client.post = mocker.AsyncMock(
        return_value=httpx.Response(
            422,
            json={"ok": False, "errors": [{"path": "ideas/cat/post.mdx", "message": "未注册的 JSX 组件: UnknownTag"}]},
        )
    )
    mocker.patch("app.git_ops.watcher.httpx.AsyncClient", return_value=mock_client)

    blocked_mdx = await watcher.process_local_content_events(
        mock_session,
        tmp_path,
        [("M", "ideas/cat/post.mdx")],
        app_settings=fake_settings,
    )
    assert blocked_mdx.status == "blocked"
    assert blocked_mdx.stage == "mdx"
    mock_service_cls.assert_not_called()

    # 4. 前端暂不可达 / 返回 500 时降级放行，并定向调用 sync_changed_files
    mock_service = mocker.MagicMock()
    mock_service.sync_changed_files = mocker.AsyncMock(
        return_value=SyncStats(added=[], updated=["ideas/cat/post.mdx"], deleted=[], skipped=0, duration=0.1, errors=[])
    )
    mock_service.sync_all = mocker.AsyncMock(
        return_value=SyncStats(added=[], updated=["ideas/cat/post.mdx"], deleted=[], skipped=0, duration=0.2, errors=[])
    )
    mock_service_cls.return_value = mock_service
    mock_client.post = mocker.AsyncMock(
        return_value=httpx.Response(500, text="Internal Server Error")
    )

    synced = await watcher.process_local_content_events(
        mock_session,
        tmp_path,
        [("M", "ideas/cat/post.mdx")],
        app_settings=fake_settings,
    )
    assert synced.status == "synced"
    mock_service.sync_changed_files.assert_awaited_once_with([("M", "ideas/cat/post.mdx")])
    mock_service.sync_all.assert_not_awaited()

    # 5. 新增 index.md 时自动转全量 sync_all
    full_res = await watcher.process_local_content_events(
        mock_session,
        tmp_path,
        [("A", "ideas/cat/index.md")],
        app_settings=fake_settings,
    )
    assert full_res.status == "synced"
    mock_service.sync_all.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_local_changes_router_auth_production_guard_and_responses(mocker, tmp_path: Path):
    """验证 /ops/git/local-changes 接口的生产环境禁用(404)、密钥校验(401)及 200/422 响应。"""
    async def _override_session():
        yield mocker.MagicMock()

    app.dependency_overrides[get_async_session] = _override_session
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
        ) as client:
            # 生产环境返回 404
            mocker.patch.object(settings, "environment", "production")
            mocker.patch.object(settings, "ENABLE_LOCAL_CONTENT_WATCHER", True)
            prod_res = await client.post(
                f"{settings.API_PREFIX}/ops/git/local-changes",
                json={"changes": [], "requires_full": False},
            )
            assert prod_res.status_code == 404

            # 非生产 + 开启开关，但未传或错传 Bearer secret 返回 401
            mocker.patch.object(settings, "environment", "test")
            mocker.patch.object(settings, "REVALIDATE_SECRET", "top-secret")
            mocker.patch.object(settings, "CONTENT_DIR", str(tmp_path))
            unauth_res = await client.post(
                f"{settings.API_PREFIX}/ops/git/local-changes",
                headers={"Authorization": "Bearer wrong"},
                json={"changes": [], "requires_full": False},
            )
            assert unauth_res.status_code == 401

            # 预检 blocked 返回 422
            mocker.patch(
                "app.git_ops.router.process_local_content_events",
                new=mocker.AsyncMock(
                    return_value=watcher.LocalChangesResponse(
                        status="blocked",
                        stage="mdx",
                        message="bad mdx",
                        errors=["ideas/cat/p.mdx: err"],
                    )
                ),
            )
            blocked_res = await client.post(
                f"{settings.API_PREFIX}/ops/git/local-changes",
                headers={"Authorization": "Bearer top-secret"},
                json={"changes": [{"status": "M", "path": "ideas/cat/p.mdx"}]},
            )
            assert blocked_res.status_code == 422
            assert blocked_res.json()["status"] == "blocked"

            # 合法变更同步完成返回 200
            mocker.patch(
                "app.git_ops.router.process_local_content_events",
                new=mocker.AsyncMock(
                    return_value=watcher.LocalChangesResponse(
                        status="synced",
                        message="ok",
                    )
                ),
            )
            ok_res = await client.post(
                f"{settings.API_PREFIX}/ops/git/local-changes",
                headers={"Authorization": "Bearer top-secret"},
                json={"changes": [{"status": "M", "path": "ideas/cat/p.mdx"}]},
            )
            assert ok_res.status_code == 200
            assert ok_res.json()["status"] == "synced"
    finally:
        app.dependency_overrides.clear()
