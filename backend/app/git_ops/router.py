from typing import Annotated

from app.core.db import get_async_session
from app.git_ops.service import GitOpsService, SyncStats
from app.users.dependencies import get_current_adminuser
from app.users.model import User
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


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
