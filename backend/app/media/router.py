"""
媒体文件路由（API Endpoints）

定义所有媒体文件相关的 API 接口

权限设计：
- 路由层：粗粒度权限（是否登录、是否管理员）
- Service层：细粒度权限（是否是所有者，超级管理员绕过）
"""

import logging
from typing import Annotated
from uuid import UUID

from app.core.db import get_async_session
from app.media import crud, service
from app.media.dependencies import (
    get_cache_headers,
    get_media_query_params,
    get_search_params,
    validate_file_upload,
)
from app.media.model import FileUsage
from app.media.schema import (
    BatchDeleteRequest,
    BatchDeleteResponse,
    MediaFileListResponse,
    MediaFileQuery,
    MediaFileResponse,
    MediaFileUpdate,
    MediaFileUploadResponse,
    PublicMediaFilesParams,
    ThumbnailRegenerateResponse,
    TogglePublicityRequest,
)
from app.users.dependencies import get_current_active_user, get_current_adminuser
from app.users.model import User
from fastapi import APIRouter, Depends, Form, UploadFile, status
from fastapi.responses import FileResponse
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter()


# ========================================
# 公开接口（无需认证）
# ========================================


@router.get(
    "/public", response_model=list[MediaFileResponse], summary="获取公开文件列表"
)
async def get_public_files(
    params: PublicMediaFilesParams = Depends(),
    session: AsyncSession = Depends(get_async_session),
):
    """获取公开文件列表（无需认证）"""
    files = await service.get_public_media_files(
        session=session,
        media_type=params.media_type,
        usage=params.usage,
        limit=params.page_size,
        offset=(params.page - 1) * params.page_size,
    )
    return files


# ========================================
# 文件上传接口（需要登录）
# ========================================


@router.post(
    "/upload",
    response_model=MediaFileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="上传文件",
)
async def upload_file(
    file: Annotated[UploadFile, Depends(validate_file_upload())],
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    usage: Annotated[FileUsage, Form(description="文件用途")] = FileUsage.GENERAL,
    is_public: Annotated[bool, Form(description="是否公开")] = False,
    description: Annotated[str, Form(description="文件描述")] = "",
    alt_text: Annotated[str, Form(description="替代文本")] = "",
):
    """上传媒体文件（需要登录）"""
    file_content = await file.read()

    media_file = await service.create_media_file(
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


# ========================================
# 文件查询接口（需要登录）
# ========================================


@router.get(
    "/",
    response_model=MediaFileListResponse,
    summary="获取文件列表",
)
async def get_user_files(
    current_user: Annotated[User, Depends(get_current_active_user)],
    query_params: Annotated[MediaFileQuery, Depends(get_media_query_params)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """获取当前用户的媒体文件列表（需要登录）"""
    files = await service.get_user_media_files(
        user_id=current_user.id,
        session=session,
        q=query_params.q,
        media_type=query_params.media_type,
        usage=query_params.usage,
        limit=query_params.limit,
        offset=query_params.offset,
    )

    return MediaFileListResponse(total=len(files), files=files)


@router.get(
    "/{file_id}",
    response_model=MediaFileResponse,
    summary="获取文件详情",
)
async def get_file_detail(
    file_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """获取媒体文件详细信息（需要登录，service层检查权限）"""
    from app.media.exceptions import MediaFileNotFoundError

    media_file = await crud.get_media_file(session, file_id)
    if not media_file:
        raise MediaFileNotFoundError(f"媒体文件不存在: {file_id}")

    # 公开文件或自己的文件或超级管理员可以查看
    from app.core.exceptions import InsufficientPermissionsError

    if (
        not media_file.is_public
        and media_file.uploader_id != current_user.id
        and not current_user.is_superadmin
    ):
        raise InsufficientPermissionsError("无权访问此文件")

    return media_file


@router.get(
    "/search",
    response_model=MediaFileListResponse,
    summary="搜索文件",
)
async def search_files(
    current_user: Annotated[User, Depends(get_current_active_user)],
    search_params: Annotated[dict, Depends(get_search_params)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """搜索媒体文件（需要登录）"""
    files = await service.search_media_files(
        session=session,
        query=search_params["query"],
        user_id=current_user.id,
        media_type=search_params["media_type"],
        limit=search_params["limit"],
        offset=search_params["offset"],
    )

    return MediaFileListResponse(total=len(files), files=files)


# ========================================
# 文件更新接口（需要登录）
# ========================================


@router.patch(
    "/{file_id}",
    response_model=MediaFileResponse,
    summary="更新文件信息",
)
async def update_file(
    file_id: UUID,
    update_data: MediaFileUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """更新媒体文件信息（需要是所有者或超级管理员）"""
    updated_file = await service.update_media_file_info(
        session, file_id, update_data, current_user.id, current_user.is_superadmin
    )
    return updated_file


@router.patch(
    "/{file_id}/publicity",
    response_model=MediaFileResponse,
    summary="切换文件公开状态",
)
async def toggle_file_publicity(
    file_id: UUID,
    request: TogglePublicityRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: AsyncSession = Depends(get_async_session),
):
    """切换文件公开状态（需要是所有者或超级管理员）"""
    updated_file = await service.toggle_file_publicity(
        session=session,
        file_id=file_id,
        user_id=current_user.id,
        is_public=request.is_public,
        is_superadmin=current_user.is_superadmin,
    )
    return updated_file


# ========================================
# 文件删除接口（需要登录）
# ========================================


@router.delete(
    "/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除文件",
)
async def delete_file(
    file_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """删除媒体文件（需要是所有者或超级管理员）"""
    await service.delete_media_file(
        session, file_id, current_user.id, current_user.is_superadmin
    )
    return None


@router.post(
    "/batch-delete",
    response_model=BatchDeleteResponse,
    summary="批量删除文件",
)
async def batch_delete_files(
    request: BatchDeleteRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """批量删除媒体文件（需要登录）"""
    deleted_count = await service.batch_delete_media_files(request.file_ids, session)
    return BatchDeleteResponse(message="批量删除完成", deleted_count=deleted_count)


# ========================================
# 缩略图相关接口（需要登录）
# ========================================


@router.post(
    "/{file_id}/regenerate-thumbnails",
    response_model=ThumbnailRegenerateResponse,
    summary="重新生成缩略图",
)
async def regenerate_thumbnails(
    file_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """重新生成缩略图（需要是所有者或超级管理员）"""
    thumbnails = await service.regenerate_thumbnails(
        file_id, session, current_user.id, current_user.is_superadmin
    )

    return ThumbnailRegenerateResponse(
        message="缩略图重新生成成功",
        thumbnails=thumbnails,
    )


# ========================================
# 文件访问接口（需要登录）
# ========================================


@router.get(
    "/{file_id}/view",
    response_class=FileResponse,
    summary="查看文件",
)
async def view_file(
    file_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """查看媒体文件（需要登录，带权限检查）"""
    from app.core.exceptions import InsufficientPermissionsError
    from app.media.exceptions import MediaFileNotFoundError

    media_file = await crud.get_media_file(session, file_id)
    if not media_file:
        raise MediaFileNotFoundError(f"媒体文件不存在: {file_id}")

    # 权限检查：公开文件或自己的文件或超级管理员
    if (
        not media_file.is_public
        and media_file.uploader_id != current_user.id
        and not current_user.is_superadmin
    ):
        raise InsufficientPermissionsError("无权访问此文件")

    # 更新查看次数
    await service.increment_view_count(session, media_file)

    headers = get_cache_headers(media_file)
    return FileResponse(
        path=str(service.get_full_path(media_file)),
        filename=media_file.original_filename,
        media_type=media_file.mime_type,
        headers=headers,
    )


@router.get(
    "/{file_id}/thumbnail/{size}",
    response_class=FileResponse,
    summary="查看缩略图",
)
async def view_thumbnail(
    file_id: UUID,
    size: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """查看缩略图（需要登录，带权限检查）"""
    from app.core.exceptions import InsufficientPermissionsError
    from app.media.exceptions import MediaFileNotFoundError

    media_file = await crud.get_media_file(session, file_id)
    if not media_file:
        raise MediaFileNotFoundError(f"媒体文件不存在: {file_id}")

    # 权限检查：公开文件或自己的文件或超级管理员
    if (
        not media_file.is_public
        and media_file.uploader_id != current_user.id
        and not current_user.is_superadmin
    ):
        raise InsufficientPermissionsError("无权访问此文件")

    thumbnail_path = service.get_thumbnail_path(media_file, size)
    headers = get_cache_headers(media_file)
    return FileResponse(
        path=str(thumbnail_path), media_type="image/webp", headers=headers
    )


@router.get(
    "/{file_id}/download",
    response_class=FileResponse,
    summary="下载文件",
)
async def download_file(
    file_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """下载媒体文件（需要登录，带权限检查）"""
    from app.core.exceptions import InsufficientPermissionsError
    from app.media.exceptions import MediaFileNotFoundError

    media_file = await crud.get_media_file(session, file_id)
    if not media_file:
        raise MediaFileNotFoundError(f"媒体文件不存在: {file_id}")

    # 权限检查：公开文件或自己的文件或超级管理员
    if (
        not media_file.is_public
        and media_file.uploader_id != current_user.id
        and not current_user.is_superadmin
    ):
        raise InsufficientPermissionsError("无权访问此文件")

    # 更新下载次数
    await service.increment_download_count(session, media_file)

    return FileResponse(
        path=str(service.get_full_path(media_file)),
        filename=media_file.original_filename,
        media_type=media_file.mime_type,
    )


# ========================================
# 统计接口（需要登录）
# ========================================


@router.get(
    "/stats/overview",
    summary="获取统计概览",
)
async def get_stats_overview(
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """获取用户媒体文件统计概览（需要登录）"""
    return await service.get_user_media_stats(session, current_user.id)


# ========================================
# 管理员接口（需要管理员权限）
# ========================================


@router.get(
    "/admin/all",
    response_model=MediaFileListResponse,
    summary="获取所有文件（管理员）",
)
async def get_all_files_admin(
    current_user: Annotated[User, Depends(get_current_adminuser)],
    query_params: Annotated[MediaFileQuery, Depends(get_media_query_params)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """获取系统中所有媒体文件（仅管理员）"""
    files = await service.get_all_media_files(
        session=session,
        media_type=query_params.media_type,
        usage=query_params.usage,
        limit=query_params.limit,
        offset=query_params.offset,
    )

    return MediaFileListResponse(total=len(files), files=files)
