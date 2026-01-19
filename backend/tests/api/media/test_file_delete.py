"""
文件删除接口测试 (DELETE /media/{file_id})

测试文件删除的各种场景：
- 成功删除：所有者删除文件
- 权限测试：非所有者不能删除文件
- 清理：确认磁盘文件和缩略图被删除
"""

import uuid
from pathlib import Path

import pytest
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig

# ========================================
# 成功删除测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_delete_file_by_owner(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    temp_media_dir: Path,
    api_urls: APIConfig,
):
    """测试文件所有者成功删除文件"""
    # 上传文件
    files = {"file": ("delete_test.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "description": "待删除文件",
    }

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    file_info = upload_response.json()["file"]
    file_id = file_info["id"]
    file_path = file_info["file_path"]

    # 验证文件确实存在
    full_file_path = temp_media_dir / file_path
    assert full_file_path.exists()

    # 删除文件
    response = await async_client.delete(
        api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_204_NO_CONTENT

    # 验证文件已被删除
    assert not full_file_path.exists()

    # 验证文件记录也被删除（尝试再次获取应该返回404）
    get_response = await async_client.get(
        api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
    )
    assert get_response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
@pytest.mark.media
async def test_delete_file_with_thumbnails(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    large_image_data: bytes,
    temp_media_dir: Path,
    api_urls: APIConfig,
):
    """测试删除带缩略图的文件"""
    # 上传大图片（会生成缩略图）
    files = {"file": ("large_with_thumbnails.jpg", large_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "description": "带缩略图的大图片",
    }

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    file_info = upload_response.json()["file"]
    file_id = file_info["id"]
    file_path = file_info["file_path"]

    # 验证主文件存在
    full_file_path = temp_media_dir / file_path
    assert full_file_path.exists()

    # 验证缩略图存在（如果有的话）
    thumbnails = file_info.get("thumbnails", {})
    thumbnail_paths = []
    if thumbnails:
        for size, thumb_path in thumbnails.items():
            if thumb_path:
                full_thumb_path = temp_media_dir / thumb_path
                if full_thumb_path.exists():
                    thumbnail_paths.append(full_thumb_path)

    # 删除文件
    response = await async_client.delete(
        api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_204_NO_CONTENT

    # 验证主文件已被删除
    assert not full_file_path.exists()

    # 验证缩略图也被删除
    for thumb_path in thumbnail_paths:
        assert not thumb_path.exists()


# ========================================
# 权限拒绝测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_delete_file_access_denied(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试非所有者不能删除文件"""
    # 普通用户上传文件
    files = {"file": ("protected_file.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "description": "受保护文件",
    }

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    file_info = upload_response.json()["file"]
    file_id = file_info["id"]

    # 管理员尝试删除（代表其他用户）
    response = await async_client.delete(
        api_urls.media_url(f"/{file_id}"), headers=admin_user_token_headers
    )

    # 应该返回权限错误或404（取决于实现）
    assert response.status_code in [
        status.HTTP_403_FORBIDDEN,
        status.HTTP_404_NOT_FOUND,
    ]

    # 验证文件仍然存在（原所有者应该还能访问）
    get_response = await async_client.get(
        api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
    )
    assert get_response.status_code == status.HTTP_200_OK


@pytest.mark.asyncio
@pytest.mark.media
async def test_delete_file_without_auth(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试未认证用户不能删除文件"""
    # 上传文件
    files = {"file": ("auth_required.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "general", "description": "需要认证"}

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    file_info = upload_response.json()["file"]
    file_id = file_info["id"]

    # 未认证尝试删除
    response = await async_client.delete(api_urls.media_url(f"/{file_id}"))

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ========================================
# 文件不存在测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_delete_file_not_found(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试删除不存在的文件"""
    fake_file_id = str(uuid.uuid4())

    response = await async_client.delete(
        api_urls.media_url(f"/{fake_file_id}"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
@pytest.mark.media
async def test_delete_file_invalid_uuid(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试无效UUID格式"""
    invalid_uuid = "invalid-uuid-format"

    response = await async_client.delete(
        api_urls.media_url(f"/{invalid_uuid}"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# ========================================
# 重复删除测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_delete_file_twice(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试重复删除同一文件"""
    # 上传文件
    files = {"file": ("delete_twice.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "general", "description": "重复删除测试"}

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    file_info = upload_response.json()["file"]
    file_id = file_info["id"]

    # 第一次删除
    response = await async_client.delete(
        api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
    )
    assert response.status_code == status.HTTP_204_NO_CONTENT

    # 第二次删除
    response = await async_client.delete(
        api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


# ========================================
# 文件系统清理验证
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_delete_file_filesystem_cleanup(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    temp_media_dir: Path,
    api_urls: APIConfig,
):
    """测试删除文件后文件系统的清理"""
    # 上传多个文件
    file_ids = []
    file_paths = []

    for i in range(3):
        files = {
            "file": (
                f"cleanup_test_{i}.jpg",
                sample_image_data + str(i).encode(),
                "image/jpeg",
            )
        }
        data = {"usage": "general", "description": f"清理测试文件 {i}"}

        upload_response = await async_client.post(
            api_urls.media_url("/upload"),
            files=files,
            data=data,
            headers=normal_user_token_headers,
        )

        assert upload_response.status_code == status.HTTP_201_CREATED
        file_info = upload_response.json()["file"]
        file_ids.append(file_info["id"])
        file_paths.append(temp_media_dir / file_info["file_path"])

    # 验证所有文件都存在
    for file_path in file_paths:
        assert file_path.exists()

    # 删除第一个和第三个文件
    for i in [0, 2]:
        response = await async_client.delete(
            api_urls.media_url(f"/{file_ids[i]}"), headers=normal_user_token_headers
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT

    # 验证删除的文件不存在，保留的文件存在
    assert not file_paths[0].exists()  # 已删除
    assert file_paths[1].exists()  # 保留
    assert not file_paths[2].exists()  # 已删除


# ========================================
# 并发删除测试 - 暂时跳过，需要更复杂的事务处理
# ========================================


# async def test_delete_file_concurrent(
#     async_client: AsyncClient,
#     normal_user_token_headers: dict,
#     sample_image_data: bytes,
#     api_urls: APIConfig,
# ):
#     """测试并发删除文件 - 暂时跳过，需要更复杂的事务处理"""
#     pass
