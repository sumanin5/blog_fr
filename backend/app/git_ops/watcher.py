"""事件驱动型本地内容变更预检与同步处理器（零后端轮询）。

后端不再在后台轮询宿主机挂载目录；仅当非生产环境收到来自宿主机 OS 原生事件监听器的
HTTP 推送请求（`POST /api/v1/ops/git/local-changes`）时，才按需执行：
契约校验 -> 前端 dev `/api/mdx-precheck` 编译预检 -> 进程内数据库定向增量同步。
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Iterable

import httpx
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.git_ops.content_contract import validate as validate_content_contract
from app.git_ops.schema import LocalChangesResponse
from app.git_ops.service import GitOpsService
from app.git_ops.watch_planner import (
    collect_contract_files,
    is_article_path,
    needs_mdx_check,
    plan_sync_changes,
    scan_snapshot,
    strip_mdx_frontmatter,
)

logger = logging.getLogger(__name__)


def is_local_event_push_enabled(app_settings=settings) -> bool:
    """仅允许在非生产环境且显式启用开关时接收本地事件推送。"""
    if getattr(app_settings, "environment", "local") == "production":
        return False
    return bool(getattr(app_settings, "ENABLE_LOCAL_CONTENT_WATCHER", False))


def run_contract_precheck(content_root: Path) -> list[str]:
    """在进程内执行契约校验（仅读取有效文章树，跳过 .git/.agent 等无关目录）。"""
    try:
        files = collect_contract_files(content_root)
    except (OSError, ValueError, UnicodeError) as exc:
        return [str(exc)]
    return validate_content_contract(files)


async def run_frontend_mdx_precheck(
    content_root: Path,
    rel_paths: Iterable[str],
    *,
    frontend_url: str,
    revalidate_secret: str,
) -> tuple[bool, list[str]]:
    """委托前端开发环境 `/api/mdx-precheck` 验证真实 compileMDX 与组件白名单。"""
    candidates = [
        rel
        for rel in rel_paths
        if needs_mdx_check(content_root / rel)
    ]
    if not candidates:
        return True, []

    if not frontend_url or not revalidate_secret:
        return True, []

    payload = {
        "files": [
            {
                "path": rel,
                "source": strip_mdx_frontmatter(
                    (content_root / rel).read_text(encoding="utf-8")
                ),
            }
            for rel in candidates
        ]
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{frontend_url.rstrip('/')}/api/mdx-precheck",
                headers={
                    "Authorization": f"Bearer {revalidate_secret}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=25.0,
            )
    except httpx.HTTPError as exc:
        logger.warning(
            "⚠️ 前端 MDX 预检接口暂不可达（%s），仅保留后端契约校验。",
            str(exc) or type(exc).__name__,
        )
        return True, []

    if response.status_code == 200:
        return True, []

    if response.status_code != 422:
        logger.warning(
            "⚠️ 前端 MDX 预检返回状态 %s（可能前端未启用 dev 预检或正在重启），仅保留后端契约校验。",
            response.status_code,
        )
        return True, []

    try:
        detail = response.json()
        errors = detail.get("errors") or []
        formatted = [
            f"{item.get('path', 'unknown')}: {item.get('message', '')}"
            for item in errors
        ]
        return False, formatted or [response.text]
    except ValueError:
        return False, [response.text or f"HTTP {response.status_code}"]


def _list_all_article_paths(content_root: Path) -> list[str]:
    return [
        rel
        for rel in sorted(scan_snapshot(content_root))
        if is_article_path(rel)
    ]


async def process_local_content_events(
    session: AsyncSession,
    content_root: Path,
    raw_changes: Iterable[tuple[str, str]],
    *,
    requires_full: bool = False,
    app_settings=settings,
) -> LocalChangesResponse:
    """响应宿主机推送的文件变动事件：规划 -> 预检 -> 入库。"""
    planned_full, target_changes = await asyncio.to_thread(
        plan_sync_changes, list(raw_changes), content_root
    )
    final_full = requires_full or planned_full

    if not final_full and not target_changes:
        return LocalChangesResponse(
            status="skipped",
            message="仅非文章文件变动，已跳过数据库同步",
        )

    contract_errors = await asyncio.to_thread(run_contract_precheck, content_root)
    if contract_errors:
        logger.warning(
            "❌ [LocalPush] 契约校验未通过，跳过入库: %s",
            "; ".join(contract_errors[:5]),
        )
        return LocalChangesResponse(
            status="blocked",
            stage="contract",
            message="内容契约校验未通过，已跳过本次入库",
            errors=contract_errors,
        )

    mdx_targets = (
        await asyncio.to_thread(_list_all_article_paths, content_root)
        if final_full
        else [
            rel_path
            for status, rel_path in target_changes
            if status != "D"
        ]
    )
    mdx_ok, mdx_errors = await run_frontend_mdx_precheck(
        content_root,
        mdx_targets,
        frontend_url=getattr(app_settings, "FRONTEND_URL", ""),
        revalidate_secret=getattr(app_settings, "REVALIDATE_SECRET", ""),
    )
    if not mdx_ok:
        logger.warning(
            "❌ [LocalPush] MDX 编译预检未通过，跳过入库: %s",
            "; ".join(mdx_errors[:5]),
        )
        return LocalChangesResponse(
            status="blocked",
            stage="mdx",
            message="MDX 编译预检未通过，已跳过本次入库（修好保存后会自动重试）",
            errors=mdx_errors,
        )

    service = GitOpsService(session)
    if final_full:
        stats = await service.sync_all()
    else:
        stats = await service.sync_changed_files(target_changes)

    logger.info(
        "📊 [LocalPush] 同步完成: +%d ~%d -%d (skipped=%d, %.2fs)",
        len(stats.added),
        len(stats.updated),
        len(stats.deleted),
        stats.skipped,
        stats.duration,
    )
    return LocalChangesResponse(
        status="synced",
        message="本地内容变动已预检并同步完成",
        stats=stats,
    )
