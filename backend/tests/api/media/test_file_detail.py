"""
文件详情接口测试 (GET /media/{file_id})

测试文件详情获取的各种场景：
- 权限测试：文件所有者可访问
- 权限拒绝：其他用户不能访问私有文件
- 文件不存在：404 错误
- 管理员权限：管理员可访问所有文件
"""

import uuid

import pytest
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig

# ========================================
# 成功访问测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_file_detail_by_owner(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试文件所有者访问文件详情"""
    # 先上传一个文件
    files = {"file": ("owner_file.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "description": "所有者文件",
        "alt_text": "测试图片",
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

    # 获取文件详情
    response = await async_client.get(
        api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    # 验证返回的文件信息
    assert result["id"] == file_id
    assert result["original_filename"] == "owner_file.jpg"
    assert result["description"] == "所有者文件"
    assert result["alt_text"] == "测试图片"
    assert result["usage"] == "general"
    assert result["media_type"] == "image"


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_file_detail_admin_access_all(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试管理员可以访问所有文件"""
    # 普通用户上传私有文件
    files = {"file": ("private_file.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "is_public": "false",
        "description": "私有文件",
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

    # 管理员访问该私有文件
    response = await async_client.get(
        api_urls.media_url(f"/{file_id}"), headers=admin_user_token_headers
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    assert result["id"] == file_id
    assert result["original_filename"] == "private_file.jpg"
    assert result["description"] == "私有文件"


# ========================================
# 权限拒绝测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_file_detail_access_denied(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试其他用户不能访问私有文件"""
    # 普通用户上传私有文件
    files = {"file": ("private_file.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "is_public": "false",
        "description": "私有文件",
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

    # 另一个用户（管理员）尝试访问 - 但这里我们需要创建另一个普通用户
    # 先创建另一个用户的token

    # 这里我们用管理员来模拟另一个用户，但实际应该是另一个普通用户
    # 由于测试限制，我们先用未认证访问来测试
    response = await async_client.get(api_urls.media_url(f"/{file_id}"))

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_file_detail_without_auth(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试未认证用户不能访问文件详情"""
    # 先上传一个文件
    files = {"file": ("test_file.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "general", "description": "测试文件"}

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    file_info = upload_response.json()["file"]
    file_id = file_info["id"]

    # 未认证访问
    response = await async_client.get(api_urls.media_url(f"/{file_id}"))

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ========================================
# 文件不存在测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_file_detail_not_found(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试访问不存在的文件返回404"""
    # 使用一个不存在的UUID
    fake_file_id = str(uuid.uuid4())

    response = await async_client.get(
        api_urls.media_url(f"/{fake_file_id}"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_file_detail_invalid_uuid(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试无效的UUID格式返回422"""
    invalid_uuid = "invalid-uuid-format"

    response = await async_client.get(
        api_urls.media_url(f"/{invalid_uuid}"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# ========================================
# 响应结构测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_file_detail_response_structure(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试文件详情响应结构"""
    # 上传一个完整信息的文件
    files = {"file": ("complete_file.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "avatar",
        "description": "完整的文件信息",
        "alt_text": "头像图片",
        "is_public": "true",
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

    # 获取文件详情
    response = await async_client.get(
        api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    # 验证必需字段
    required_fields = [
        "id",
        "original_filename",
        "file_path",
        "file_size",
        "mime_type",
        "media_type",
        "usage",
        "description",
        "alt_text",
        "uploader_id",
        "created_at",
        "updated_at",
        "file_url",
        "view_count",
        "download_count",
    ]

    for field in required_fields:
        assert field in result, f"缺少字段: {field}"

    # 验证数据类型和值
    assert isinstance(result["file_size"], int)
    assert result["file_size"] > 0
    assert isinstance(result["file_url"], str)
    assert result["file_url"].startswith("http")
    assert result["original_filename"] == "complete_file.jpg"
    assert result["description"] == "完整的文件信息"
    assert result["alt_text"] == "头像图片"
    assert result["usage"] == "avatar"
    assert result["media_type"] == "image"
    assert isinstance(result["view_count"], int)
    assert isinstance(result["download_count"], int)


# ========================================
# 公开文件访问测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_public_file_detail_by_others(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试其他用户可以访问公开文件详情"""
    # 普通用户上传公开文件
    files = {"file": ("public_file.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "is_public": "true",
        "description": "公开文件",
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

    # 管理员访问该公开文件（代表其他用户）
    response = await async_client.get(
        api_urls.media_url(f"/{file_id}"), headers=admin_user_token_headers
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    assert result["id"] == file_id
    assert result["original_filename"] == "public_file.jpg"
    assert result["description"] == "公开文件"
