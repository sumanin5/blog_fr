"""缩略图管理路由"""

from typing import Annotated
from uuid import UUID

from app.core.db import get_async_session
from app.media.routers.api_doc import thumbnail as doc
from app.media.schemas import ThumbnailRegenerateResponse
from app.media.services import thumbnail as thumbnail_service
from app.users.dependencies import get_current_active_user
from app.users.model import User
from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter()


@router.post(
    "/{file_id}/regenerate-thumbnails",
    response_model=ThumbnailRegenerateResponse,
    summary="重新生成缩略图",
    description=doc.REGENERATE_THUMBNAILS_DOC,
)
async def regenerate_thumbnails(
    file_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    thumbnails = await thumbnail_service.regenerate_thumbnails(
        file_id, session, current_user.id, current_user.is_superadmin
    )

    return ThumbnailRegenerateResponse(
        message="缩略图重新生成成功",
        thumbnails=thumbnails,
    )
