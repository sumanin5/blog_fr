"""
媒体文件路由（API Endpoints）

定义所有媒体文件相关的 API 接口
"""

import logging
from typing import Annotated

from app.core.config import settings
from app.core.db import get_async_session
from app.media import service
from app.media.dependencies import (
    check_file_owner,
    check_file_owner_or_admin,
    get_media_query_params,
    get_search_params,
    get_user_media_stats,
)
from app.media.exceptions import MediaFileNotFoundError
from app.media.model import FileUsage, MediaFile
from app.media.schema import (
    BatchDeleteRequest,
    BatchDeleteResponse,
    MediaFileListResponse,
    MediaFileQuery,
    MediaFileResponse,
    MediaFileUpdate,
    MediaFileUploadResponse,
    PublicMediaFilesParams,
    ThumbnailInfo,
    ThumbnailRegenerateResponse,
    TogglePublicityRequest,
)
from app.users.dependencies import get_current_active_user, get_current_adminuser
from app.users.model import User
from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from fastapi.responses import FileResponse
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)

# ========================================
# 创建路由
# ========================================
router = APIRouter()


@router.get("/public", response_model=list[MediaFileResponse])
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

    # 构建响应
    file_responses = []
    for media_file in files:
        file_response = MediaFileResponse(
            **media_file.model_dump(exclude={"thumbnails"}),
            file_url=service.get_file_url(media_file),
            thumbnails=_build_thumbnail_info(media_file),
        )
        file_responses.append(file_response)

    return file_responses


@router.patch("/{file_id}/publicity", response_model=MediaFileResponse)
async def toggle_file_publicity(
    request: TogglePublicityRequest,
    media_file: Annotated[MediaFile, Depends(check_file_owner)],
    session: AsyncSession = Depends(get_async_session),
):
    """切换文件公开状态（需要认证）"""
    updated_file = await service.toggle_file_publicity(
        session=session,
        file_id=media_file.id,
        user_id=media_file.uploader_id,
        is_public=request.is_public,
    )

    return MediaFileResponse(
        **updated_file.model_dump(exclude={"thumbnails"}),
        file_url=service.get_file_url(updated_file),
        thumbnails=_build_thumbnail_info(updated_file),
    )


# ========================================
# 文件上传接口
# ========================================


@router.post(
    "/upload",
    response_model=MediaFileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="上传文件",
    description="上传媒体文件（图片、视频、文档等）",
)
async def upload_file(
    file: Annotated[UploadFile, File(..., description="要上传的文件")],
    usage: Annotated[FileUsage, Form(description="文件用途")] = FileUsage.GENERAL,
    is_public: Annotated[bool, Form(description="是否公开")] = False,
    description: Annotated[str, Form(description="文件描述")] = "",
    alt_text: Annotated[str, Form(description="替代文本")] = "",
    current_user: Annotated[User, Depends(get_current_active_user)] = None,
    session: Annotated[AsyncSession, Depends(get_async_session)] = None,
):
    """
    上传媒体文件

    - **file**: 要上传的文件
    - **usage**: 文件用途（general, avatar, cover等）
    - **description**: 文件描述
    - **alt_text**: 替代文本（用于图片的无障碍访问）

    Returns:
        上传成功的文件信息
    """
    # 读取文件内容
    file_content = await file.read()

    logger.info(f"接收到的参数 - description: '{description}', alt_text: '{alt_text}'")

    # 创建媒体文件
    media_file = await service.create_media_file(
        file_content=file_content,
        filename=file.filename,
        uploader_id=current_user.id,
        session=session,
        usage=usage.value,
        is_public=is_public,
        description=description,
        alt_text=alt_text,
    )
    logger.info(
        f"创建的文件 - description: '{media_file.description}', alt_text: '{media_file.alt_text}'"
    )

    # 构建响应
    file_response = MediaFileResponse(
        **media_file.model_dump(exclude={"thumbnails"}),
        file_url=service.get_file_url(media_file),
        thumbnails=_build_thumbnail_info(media_file),
    )

    return MediaFileUploadResponse(message="文件上传成功", file=file_response)


# ========================================
# 文件查询接口
# ========================================


@router.get(
    "/",
    response_model=MediaFileListResponse,
    summary="获取文件列表",
    description="获取当前用户的媒体文件列表",
)
async def get_user_files(
    query_params: Annotated[MediaFileQuery, Depends(get_media_query_params)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    获取当前用户的媒体文件列表

    - **media_type**: 媒体类型过滤（image, video, document, other）
    - **usage**: 用途过滤（general, avatar, cover等）
    - **limit**: 限制数量（1-100）
    - **offset**: 偏移量
    """
    files = await service.get_user_media_files(
        user_id=current_user.id,
        session=session,
        media_type=query_params.media_type,
        usage=query_params.usage,
        limit=query_params.limit,
        offset=query_params.offset,
    )

    # 构建响应
    file_responses = []
    for media_file in files:
        file_response = MediaFileResponse(
            **media_file.model_dump(exclude={"thumbnails"}),
            file_url=service.get_file_url(media_file),
            thumbnails=_build_thumbnail_info(media_file),
        )
        file_responses.append(file_response)

    return MediaFileListResponse(total=len(file_responses), files=file_responses)


@router.get(
    "/{file_id}",
    response_model=MediaFileResponse,
    summary="获取文件详情",
    description="根据ID获取媒体文件详细信息",
)
async def get_file_detail(
    media_file: Annotated[MediaFile, Depends(check_file_owner_or_admin)],
):
    """
    获取媒体文件详细信息

    需要是文件所有者或管理员权限
    """
    return MediaFileResponse(
        **media_file.model_dump(exclude={"thumbnails"}),
        file_url=service.get_file_url(media_file),
        thumbnails=_build_thumbnail_info(media_file),
    )


@router.get(
    "/search",
    response_model=MediaFileListResponse,
    summary="搜索文件",
    description="根据关键词搜索媒体文件",
)
async def search_files(
    search_params: Annotated[dict, Depends(get_search_params)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    搜索媒体文件

    - **q**: 搜索关键词（在文件名、描述、替代文本中搜索）
    - **media_type**: 媒体类型过滤
    - **limit**: 限制数量
    - **offset**: 偏移量
    """
    from app.media import crud

    files = await crud.search_media_files(
        session=session,
        query=search_params["query"],
        user_id=current_user.id,
        media_type=search_params["media_type"],
        limit=search_params["limit"],
        offset=search_params["offset"],
    )

    # 构建响应
    file_responses = []
    for media_file in files:
        file_response = MediaFileResponse(
            **media_file.model_dump(exclude={"thumbnails"}),
            file_url=service.get_file_url(media_file),
            thumbnails=_build_thumbnail_info(media_file),
        )
        file_responses.append(file_response)

    return MediaFileListResponse(total=len(file_responses), files=file_responses)


# ========================================
# 文件更新接口
# ========================================


@router.patch(
    "/{file_id}",
    response_model=MediaFileResponse,
    summary="更新文件信息",
    description="更新媒体文件的元数据信息",
)
async def update_file(
    update_data: MediaFileUpdate,
    media_file: Annotated[MediaFile, Depends(check_file_owner)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    更新媒体文件信息

    只能更新自己上传的文件
    """
    from app.media import crud

    updated_file = await crud.update_media_file(session, media_file, update_data)

    return MediaFileResponse(
        **updated_file.model_dump(exclude={"thumbnails"}),
        file_url=service.get_file_url(updated_file),
        thumbnails=_build_thumbnail_info(updated_file),
    )


# ========================================
# 文件删除接口
# ========================================


@router.delete(
    "/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除文件",
    description="删除媒体文件及其缩略图",
)
async def delete_file(
    media_file: Annotated[MediaFile, Depends(check_file_owner)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    删除媒体文件

    只能删除自己上传的文件
    """
    await service.delete_media_file(media_file, session)
    return None


@router.post(
    "/batch-delete",
    response_model=BatchDeleteResponse,
    summary="批量删除文件",
    description="批量删除多个媒体文件",
)
async def batch_delete_files(
    request: BatchDeleteRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    批量删除媒体文件

    只能删除自己上传的文件
    """
    deleted_count = await service.batch_delete_media_files(request.file_ids, session)

    return BatchDeleteResponse(message="批量删除完成", deleted_count=deleted_count)


# ========================================
# 缩略图相关接口
# ========================================


@router.post(
    "/{file_id}/regenerate-thumbnails",
    response_model=ThumbnailRegenerateResponse,
    summary="重新生成缩略图",
    description="重新生成媒体文件的缩略图",
)
async def regenerate_thumbnails(
    media_file: Annotated[MediaFile, Depends(check_file_owner)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    重新生成缩略图

    只能处理自己上传的图片文件
    """
    await service.regenerate_thumbnails(media_file, session)

    return ThumbnailRegenerateResponse(
        message="缩略图重新生成成功", thumbnails=_build_thumbnail_info(media_file)
    )


# ========================================
# 文件访问接口（带权限检查）
# ========================================


@router.get(
    "/{file_id}/view",
    response_class=FileResponse,
    summary="查看文件",
    description="查看媒体文件（带权限检查）",
)
async def view_file(
    media_file: Annotated[MediaFile, Depends(check_file_owner_or_admin)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    查看媒体文件（带权限检查）

    需要是文件所有者或管理员权限
    """
    from pathlib import Path

    from app.media import crud

    # 更新查看次数
    await crud.update_view_count(session, media_file)

    # 构建文件路径
    file_path = Path(settings.MEDIA_ROOT) / media_file.file_path

    return FileResponse(
        path=str(file_path),
        filename=media_file.original_filename,
        media_type=media_file.mime_type,
    )


@router.get(
    "/{file_id}/thumbnail/{size}",
    response_class=FileResponse,
    summary="查看缩略图",
    description="查看媒体文件缩略图（带权限检查）",
)
async def view_thumbnail(
    size: str,
    media_file: Annotated[MediaFile, Depends(check_file_owner_or_admin)],
):
    """
    查看缩略图（带权限检查）

    需要是文件所有者或管理员权限
    """
    from pathlib import Path

    # 检查缩略图是否存在
    thumbnail_path = media_file.thumbnails.get(size)
    if not thumbnail_path:
        raise MediaFileNotFoundError(f"缩略图不存在: {size}")

    # 构建文件路径
    file_path = Path(settings.MEDIA_ROOT) / thumbnail_path
    if not file_path.exists():
        raise MediaFileNotFoundError(f"缩略图文件不存在: {thumbnail_path}")

    return FileResponse(path=str(file_path), media_type="image/webp")


@router.get(
    "/{file_id}/download",
    response_class=FileResponse,
    summary="下载文件",
    description="下载媒体文件",
)
async def download_file(
    media_file: Annotated[MediaFile, Depends(check_file_owner_or_admin)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    下载媒体文件

    需要是文件所有者或管理员权限
    """
    from pathlib import Path

    from app.media import crud

    # 更新下载次数
    await crud.update_download_count(session, media_file)

    # 构建文件路径
    file_path = Path(settings.MEDIA_ROOT) / media_file.file_path

    return FileResponse(
        path=str(file_path),
        filename=media_file.original_filename,
        media_type=media_file.mime_type,
    )


# ========================================
# 统计接口
# ========================================


@router.get(
    "/stats/overview",
    summary="获取统计概览",
    description="获取当前用户的媒体文件统计信息",
)
async def get_stats_overview(
    stats: Annotated[dict, Depends(get_user_media_stats)],
):
    """
    获取用户媒体文件统计概览

    包括文件总数、存储使用量、各类型文件数量等
    """
    return stats


# ========================================
# 管理员接口
# ========================================


@router.get(
    "/admin/all",
    response_model=MediaFileListResponse,
    summary="获取所有文件（管理员）",
    description="获取系统中所有媒体文件（仅管理员）",
)
async def get_all_files_admin(
    query_params: Annotated[MediaFileQuery, Depends(get_media_query_params)],
    current_user: Annotated[User, Depends(get_current_adminuser)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """
    获取所有媒体文件（管理员接口）
    """
    from app.media import crud

    # 管理员可以查看所有文件，不限制 user_id
    files = await crud.get_all_media_files(
        session=session,
        media_type=query_params.media_type,
        usage=query_params.usage,
        limit=query_params.limit,
        offset=query_params.offset,
    )

    # 构建响应
    file_responses = []
    for media_file in files:
        file_response = MediaFileResponse(
            **media_file.model_dump(exclude={"thumbnails"}),
            file_url=service.get_file_url(media_file),
            thumbnails=_build_thumbnail_info(media_file),
        )
        file_responses.append(file_response)

    return MediaFileListResponse(total=len(file_responses), files=file_responses)


# ========================================
# 辅助函数
# ========================================


def _build_thumbnail_info(media_file: MediaFile) -> ThumbnailInfo | None:
    """构建缩略图信息

    Args:
        media_file: 媒体文件对象

    Returns:
        ThumbnailInfo对象或None
    """
    if not media_file.thumbnails:
        return None
    base_url = settings.MEDIA_URL
    thumbnails = {}

    for size, path in media_file.thumbnails.items():
        thumbnails[size] = f"{base_url}{path}"

    return ThumbnailInfo(**thumbnails)
