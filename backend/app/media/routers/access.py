"""文件访问路由（查看/下载）"""

from typing import Annotated, Optional
from uuid import UUID

from app.core.db import get_async_session
from app.media.dependencies import get_cache_headers
from app.media.routers.api_doc import access as doc
from app.media.services import access as access_service
from app.users.dependencies import get_current_active_user, get_optional_current_user
from app.users.model import User
from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter()


@router.get(
    "/{file_id}/view",
    response_class=FileResponse,
    summary="查看媒体文件",
    description=doc.VIEW_FILE_DOC,
)
async def view_file(
    file_id: UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)] = None,
):
    file_path, media_file = await access_service.get_file_for_view(
        session, file_id, current_user
    )

    headers = get_cache_headers(media_file)
    return FileResponse(
        path=str(file_path),
        filename=media_file.original_filename,
        media_type=media_file.mime_type,
        headers=headers,
    )


@router.get(
    "/{file_id}/thumbnail/{size}",
    response_class=FileResponse,
    summary="查看缩略图",
    description=doc.VIEW_THUMBNAIL_DOC,
)
async def view_thumbnail(
    file_id: UUID,
    size: str,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    # Allow public access for thumbnails (service layer should handle public/private check)
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)] = None,
):
    thumbnail_path, media_file = await access_service.get_thumbnail_for_view(
        session, file_id, size, current_user
    )

    headers = get_cache_headers(media_file)
    return FileResponse(
        path=str(thumbnail_path), media_type="image/webp", headers=headers
    )


@router.get(
    "/{file_id}/download",
    response_class=FileResponse,
    summary="下载媒体文件",
    description=doc.DOWNLOAD_FILE_DOC,
)
async def download_file(
    file_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    file_path, media_file = await access_service.get_file_for_download(
        session, file_id, current_user
    )

    return FileResponse(
        path=str(file_path),
        filename=media_file.original_filename,
        media_type=media_file.mime_type,
    )
