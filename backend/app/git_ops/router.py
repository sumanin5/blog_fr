import logging
from typing import Annotated

from app.core.config import settings
from app.core.db import get_async_session
from app.git_ops.background_tasks import run_background_sync
from app.git_ops.components import verify_github_signature
from app.git_ops.schema import (
    OperationResponse,
    PreviewResult,
    SyncStats,
    WebhookResponse,
)
from app.git_ops.service import GitOpsService
from app.users.dependencies import get_current_adminuser
from app.users.model import User
from fastapi import APIRouter, BackgroundTasks, Depends, Header, Query, Request
from sqlmodel.ext.asyncio.session import AsyncSession

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
    summary="强制将数据库变更推送至 Git",
    description="扫描所有仅存在于数据库的文章，并将其导出为物理 MDX 文件并执行 Git 提交",
)
async def push_to_git(
    current_user: Annotated[User, Depends(get_current_adminuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    from app.git_ops.exceptions import GitOpsSyncError

    service = GitOpsService(session)
    result = await service.export_to_git(default_user=current_user)

    # 如果没有任何更新成功，且存在错误，则抛出异常以便全局处理器捕获
    if result.errors and not result.updated:
        first_error = result.errors[0]
        raise GitOpsSyncError(
            message=f"Export failed: {first_error.message}",
            detail=str(first_error.details) if first_error.details else "",
        )

    return result


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

    logger.info("Valid webhook received, triggering background sync...")
    background_tasks.add_task(run_background_sync)
    return {"status": "triggered"}
