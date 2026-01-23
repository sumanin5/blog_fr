"""管理员接口路由"""

from typing import Annotated, Optional

from app.core.db import get_async_session
from app.media import crud, utils
from app.media.model import FileUsage, MediaType
from app.media.routers.api_doc import admin as doc
from app.media.schemas import MediaFileResponse
from app.users.dependencies import get_current_adminuser
from app.users.model import User
from fastapi import APIRouter, Depends, Query
from fastapi_pagination import Page, Params
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter()


@router.get(
    "/admin/all",
    response_model=Page[MediaFileResponse],
    summary="获取系统中所有媒体文件",
    description=doc.GET_ALL_FILES_ADMIN_DOC,
)
async def get_all_files_admin(
    current_user: Annotated[User, Depends(get_current_adminuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    params: Annotated[Params, Depends()],
    q: Annotated[Optional[str], Query(description="搜索关键词")] = None,
    media_type: Annotated[
        Optional[MediaType], Query(description="媒体类型过滤")
    ] = None,
    usage: Annotated[Optional[FileUsage], Query(description="用途过滤")] = None,
):
    query = utils.build_all_media_query(
        q=q,
        media_type=media_type,
        usage=usage,
    )
    return await crud.paginate_query(session, query, params)
