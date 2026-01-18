import logging
from typing import Annotated

from app.core.config import settings
from app.core.db import get_async_session
from app.git_ops.schema import PreviewResult, SyncStats
from app.git_ops.service import GitOpsService, run_background_sync
from app.git_ops.utils import verify_github_signature
from app.users.dependencies import get_current_adminuser
from app.users.model import User
from fastapi import APIRouter, BackgroundTasks, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/sync", response_model=SyncStats, summary="手动触发 Git 同步")
async def trigger_sync(
    current_user: Annotated[User, Depends(get_current_adminuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    手动触发 GitOps 同步。
    扫描 content/ 目录下的 MDX 文件，并更新数据库。
    """
    service = GitOpsService(session)
    return await service.sync_all(default_user=current_user)


@router.get("/preview", response_model=PreviewResult, summary="预览 Git 同步变更")
async def preview_sync(
    current_user: Annotated[User, Depends(get_current_adminuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    预览即将发生的变更 (Dry Run)。
    不会修改数据库。
    """
    service = GitOpsService(session)
    return await service.preview_sync(default_user=current_user)


@router.post("/webhook", summary="GitHub Webhook 接收入口")
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: str = Header(None),
):
    """
    接收 GitHub Webhook Push 事件，触发后台同步。
    需配置 WEBHOOK_SECRET。
    """
    payload = await request.body()

    # 验证签名（会抛出 WebhookSignatureError 异常）
    verify_github_signature(payload, x_hub_signature_256, settings.WEBHOOK_SECRET)

    logger.info("Valid webhook received, triggering background sync...")
    background_tasks.add_task(run_background_sync)
    return {"status": "triggered"}
