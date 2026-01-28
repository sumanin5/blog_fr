"""当前用户文件管理路由"""

from typing import Annotated, Optional
from uuid import UUID

from app.core.db import get_async_session
from app.media import crud, utils
from app.media.model import FileUsage, MediaType
from app.media.routers.api_doc import management as doc
from app.media.schemas import (
    BatchDeleteRequest,
    BatchDeleteResponse,
    MediaFileResponse,
    MediaFileUpdate,
    TogglePublicityRequest,
)
from app.media.services import management as management_service
from app.users.dependencies import get_current_active_user
from app.users.model import User
from fastapi import APIRouter, Depends, Query, status
from fastapi_pagination import Page, Params
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter()


@router.get(
    "/",
    response_model=Page[MediaFileResponse],
    summary="获取当前用户的媒体文件列表",
    description=doc.GET_USER_FILES_DOC,
)
async def get_user_files(
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    params: Annotated[Params, Depends()],
    q: Annotated[Optional[str], Query(description="搜索关键词")] = None,
    media_type: Annotated[
        Optional[MediaType], Query(description="媒体类型过滤")
    ] = None,
    usage: Annotated[Optional[FileUsage], Query(description="用途过滤")] = None,
    mime_type: Annotated[
        Optional[str], Query(description="MIME类型过滤 (如: image/svg+xml)")
    ] = None,
):
    query = utils.build_user_media_query(
        user_id=current_user.id,
        q=q,
        media_type=media_type,
        usage=usage,
        mime_type=mime_type,
    )
    return await crud.paginate_query(session, query, params)


@router.get(
    "/{file_id}",
    response_model=MediaFileResponse,
    summary="获取媒体文件详细信息",
    description=doc.GET_FILE_DETAIL_DOC,
)
async def get_file_detail(
    file_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    from app.core.exceptions import InsufficientPermissionsError
    from app.media.exceptions import MediaFileNotFoundError

    media_file = await crud.get_media_file(session, file_id)
    if not media_file:
        raise MediaFileNotFoundError(f"媒体文件不存在: {file_id}")

    if (
        not media_file.is_public
        and media_file.uploader_id != current_user.id
        and not current_user.is_superadmin
    ):
        raise InsufficientPermissionsError("无权访问此文件")

    return media_file


@router.get(
    "/search",
    response_model=Page[MediaFileResponse],
    summary="搜索媒体文件",
    description=doc.SEARCH_FILES_DOC,
)
async def search_files(
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    params: Annotated[Params, Depends()],
    q: Annotated[str, Query(description="搜索关键词", min_length=1)],
    media_type: Annotated[
        Optional[MediaType], Query(description="媒体类型过滤")
    ] = None,
):
    query = utils.build_search_media_query(
        query=q,
        user_id=current_user.id,
        media_type=media_type,
    )
    return await crud.paginate_query(session, query, params)


@router.patch(
    "/{file_id}",
    response_model=MediaFileResponse,
    summary="更新媒体文件信息",
    description=doc.UPDATE_FILE_DOC,
)
async def update_file(
    file_id: UUID,
    update_data: MediaFileUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    updated_file = await management_service.update_media_file_info(
        session, file_id, update_data, current_user.id, current_user.is_superadmin
    )
    return updated_file


@router.patch(
    "/{file_id}/publicity",
    response_model=MediaFileResponse,
    summary="切换文件公开状态",
    description=doc.TOGGLE_FILE_PUBLICITY_DOC,
)
async def toggle_file_publicity(
    file_id: UUID,
    request: TogglePublicityRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: AsyncSession = Depends(get_async_session),
):
    updated_file = await management_service.toggle_file_publicity(
        session=session,
        file_id=file_id,
        user_id=current_user.id,
        is_public=request.is_public,
        is_superadmin=current_user.is_superadmin,
    )
    return updated_file


@router.delete(
    "/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除媒体文件",
    description=doc.DELETE_FILE_DOC,
)
async def delete_file(
    file_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    await management_service.delete_media_file(
        session, file_id, current_user.id, current_user.is_superadmin
    )
    return None


@router.post(
    "/batch-delete",
    response_model=BatchDeleteResponse,
    summary="批量删除媒体文件",
    description=doc.BATCH_DELETE_FILES_DOC,
)
async def batch_delete_files(
    request: BatchDeleteRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    deleted_count = await management_service.batch_delete_media_files(
        request.file_ids,
        session,
        current_user.id,
        current_user.is_superadmin,
    )
    return BatchDeleteResponse(message="批量删除完成", deleted_count=deleted_count)
