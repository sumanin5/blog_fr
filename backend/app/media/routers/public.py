"""公开接口路由"""

from typing import Annotated, Optional

from app.core.db import get_async_session
from app.media import crud, utils
from app.media.model import FileUsage, MediaType
from app.media.routers.api_doc import public as doc
from app.media.schemas import MediaFileResponse
from fastapi import APIRouter, Depends, Query
from fastapi_pagination import Page, Params
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter()


@router.get(
    "/public",
    response_model=Page[MediaFileResponse],
    summary="获取公开文件列表",
    description=doc.GET_PUBLIC_FILES_DOC,
)
async def get_public_files(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    params: Annotated[Params, Depends()],
    media_type: Annotated[
        Optional[MediaType], Query(description="媒体类型过滤")
    ] = None,
    usage: Annotated[Optional[FileUsage], Query(description="用途过滤")] = None,
):
    query = utils.build_public_media_query(media_type=media_type, usage=usage)
    return await crud.paginate_query(session, query, params)
