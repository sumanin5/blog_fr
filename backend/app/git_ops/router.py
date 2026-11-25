import hmac
import json
import logging
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.db import get_async_session
from app.git_ops.background_tasks import run_background_sync
from app.git_ops.components import verify_github_signature
from app.git_ops.schema import (
    LocalChangesRequest,
    LocalChangesResponse,
    OperationResponse,
    PreviewResult,
    SyncStats,
    WebhookResponse,
)
from app.git_ops.service import GitOpsService
from app.git_ops.watcher import (
    is_local_event_push_enabled,
    process_local_content_events,
)
from app.users.dependencies import get_current_adminuser
from app.users.model import User

from .api_doc import git_doc

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post(
    "/sync",
    response_model=SyncStats,
    summary="手动触发 Git 同步",
    description=git_doc.trigger_sync,
)
async def trigger_sync(
    current_user: Annotated[User, Depends(get_current_adminuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    force_full: Annotated[bool, Query(description="是否强制全量同步")] = False,
):
    from app.git_ops.exceptions import GitOpsSyncError

    service = GitOpsService(session)

    if force_full:
        result = await service.sync_all(default_user=current_user)
    else:
        result = await service.sync_incremental(default_user=current_user)

    # 如果没有任何实质性变更且存在报错，则抛出异常触发全局处理
    if result.errors and not (result.added or result.updated or result.deleted):
        first_error = result.errors[0]
        raise GitOpsSyncError(
            message=f"Sync failed: {first_error.message}",
            detail=str(first_error.details) if first_error.details else "",
        )

    return result


@router.post(
    "/push",
    response_model=SyncStats,
    summary="已停用：数据库到 Git 的反向推送",
    description="同步仅支持 Git → 数据库。此兼容入口返回 409 GITOPS_READ_ONLY，不会写文件或推送 Git。",
    deprecated=True,
)
async def push_to_git(
    current_user: Annotated[User, Depends(get_current_adminuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    from app.git_ops.exceptions import GitOpsReadOnlyError

    raise GitOpsReadOnlyError()


@router.get(
    "/preview",
    response_model=PreviewResult,
    summary="预览 Git 同步变更",
    description=git_doc.preview_sync,
)
async def preview_sync(
    _: Annotated[User, Depends(get_current_adminuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    service = GitOpsService(session)
    return await service.preview_sync()


@router.post(
    "/posts/{post_id}/resync-metadata",
    response_model=OperationResponse,
    summary="重新同步指定文章元数据",
    description=git_doc.resync_post_metadata,
)
async def resync_post_metadata(
    post_id: str,
    current_user: Annotated[User, Depends(get_current_adminuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    service = GitOpsService(session)
    await service.resync_post_metadata(post_id, default_user=current_user)
    return {
        "status": "success",
        "message": f"Post {post_id} metadata resynced successfully",
    }


@router.post(
    "/webhook",
    response_model=WebhookResponse,
    summary="GitHub Webhook 接收入口",
    description=git_doc.github_webhook,
)
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: str = Header(None),
):
    payload = await request.body()

    # 验证签名（会抛出 WebhookSignatureError 异常）
    verify_github_signature(payload, x_hub_signature_256, settings.WEBHOOK_SECRET)

    event = request.headers.get("x-github-event")
    if event and event != "push":
        return {"status": "skipped", "reason": "not a push event"}
    try:
        event_data = json.loads(payload)
        if not isinstance(event_data, dict):
            raise ValueError("Webhook payload must be an object")
    except (ValueError, UnicodeError) as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook payload") from exc
    branch = getattr(settings, "GIT_SYNC_BRANCH", "main")
    if event_data.get("ref") and event_data["ref"] != f"refs/heads/{branch}":
        return {"status": "skipped", "reason": "not the content branch"}
    if event_data.get("deleted"):
        return {"status": "skipped", "reason": "branch deletion"}

    # 单向导入不会产生回写提交。[skip ci] 也正常导入。
    # 由同步锁和成功游标处理重复通知，失败的通知可以再次投递重试。

    logger.info("✅ Valid webhook received, triggering background sync...")
    background_tasks.add_task(run_background_sync)
    return {"status": "triggered"}


@router.post(
    "/local-changes",
    response_model=LocalChangesResponse,
    summary="本地宿主机内容变动事件推送入口（仅非生产环境）",
    description="接收宿主机 OS 原生事件监听推送的内容改动，执行契约与 MDX 预检后增量写入数据库。",
)
async def handle_local_content_changes(
    payload: LocalChangesRequest,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    authorization: Annotated[str | None, Header()] = None,
):
    if not is_local_event_push_enabled(settings):
        raise HTTPException(
            status_code=404,
            detail="Local content event push endpoint is disabled",
        )

    secret = getattr(settings, "REVALIDATE_SECRET", "")
    expected = f"Bearer {secret}" if secret else ""
    if not expected or not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")

    result = await process_local_content_events(
        session,
        Path(settings.CONTENT_DIR),
        [(item.status, item.path) for item in payload.changes],
        requires_full=payload.requires_full,
        app_settings=settings,
    )
    if result.status == "blocked":
        return JSONResponse(status_code=422, content=result.model_dump(mode="json"))
    return result
