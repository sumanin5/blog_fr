"""统计接口路由"""

from typing import Annotated

from app.core.db import get_async_session
from app.media import crud
from app.media.routers.api_doc import stats as doc
from app.media.schemas.response import MediaStatsResponse
from app.users.dependencies import get_current_active_user
from app.users.model import User
from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter()


@router.get(
    "/stats/overview",
    summary="获取用户媒体文件统计概览",
    description=doc.GET_STATS_OVERVIEW_DOC,
    response_model=MediaStatsResponse,
)
async def get_stats_overview(
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    return await crud.get_user_media_stats(session, current_user.id)
