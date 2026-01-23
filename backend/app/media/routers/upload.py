"""上传接口路由"""

from typing import Annotated

from app.core.db import get_async_session
from app.media.dependencies import validate_file_upload
from app.media.model import FileUsage
from app.media.routers.api_doc import upload as doc
from app.media.schemas import MediaFileUploadResponse
from app.media.services import upload as upload_service
from app.users.dependencies import get_current_active_user
from app.users.model import User
from fastapi import APIRouter, Depends, Form, UploadFile, status
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter()


@router.post(
    "/upload",
    response_model=MediaFileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="上传媒体文件",
    description=doc.UPLOAD_FILE_DOC,
)
async def upload_file(
    file: Annotated[UploadFile, Depends(validate_file_upload())],
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    usage: Annotated[FileUsage, Form()] = FileUsage.GENERAL,
    is_public: Annotated[bool, Form()] = False,
    description: Annotated[str, Form()] = "",
    alt_text: Annotated[str, Form()] = "",
):
    file_content = await file.read()

    media_file = await upload_service.create_media_file(
        file_content=file_content,
        filename=file.filename,
        uploader_id=current_user.id,
        session=session,
        usage=usage,
        is_public=is_public,
        description=description,
        alt_text=alt_text,
    )

    return MediaFileUploadResponse(message="文件上传成功", file=media_file)
