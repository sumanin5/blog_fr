"""
文件上传接口测试

测试 POST /media/upload 接口的各种场景
"""

import pytest
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig


@pytest.mark.asyncio
@pytest.mark.media
async def test_upload_image_success(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试成功上传图片文件"""
    files = {"file": ("test.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "description": "测试图片",
        "alt_text": "测试图片描述",
    }

    response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=admin_user_token_headers,
    )

    assert response.status_code == status.HTTP_201_CREATED
    result = response.json()

    # 验证响应结构
    assert "message" in result
    assert "file" in result
    assert result["message"] == "文件上传成功"

    # 验证文件信息
    file_info = result["file"]
    assert file_info["original_filename"] == "test.jpg"
    assert file_info["mime_type"] == "image/jpeg"
    assert file_info["media_type"] == "image"
    assert file_info["usage"] == "general"
    assert file_info["description"] == "测试图片"
    assert file_info["alt_text"] == "测试图片描述"
    assert file_info["file_size"] > 0
    assert "file_url" in file_info
    assert "id" in file_info


@pytest.mark.asyncio
@pytest.mark.media
async def test_upload_different_image_formats(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    sample_jpeg_data: bytes,
    sample_webp_data: bytes,
    api_urls: APIConfig,
):
    """测试上传不同格式的图片"""
    test_cases = [
        ("test.jpeg", sample_jpeg_data, "image/jpeg"),
        ("test.webp", sample_webp_data, "image/webp"),
    ]

    for filename, file_data, mime_type in test_cases:
        files = {"file": (filename, file_data, mime_type)}
        data = {"usage": "general"}

        response = await async_client.post(
            api_urls.media_url("/upload"),
            files=files,
            data=data,
            headers=admin_user_token_headers,
        )

        assert response.status_code == status.HTTP_201_CREATED
        result = response.json()
        assert result["file"]["original_filename"] == filename
        assert result["file"]["mime_type"] == mime_type


@pytest.mark.asyncio
@pytest.mark.media
async def test_upload_large_image(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    large_image_data: bytes,
    api_urls: APIConfig,
):
    """测试上传大尺寸图片"""
    files = {"file": ("large.jpg", large_image_data, "image/jpeg")}
    data = {"usage": "general"}

    response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=admin_user_token_headers,
    )

    assert response.status_code == status.HTTP_201_CREATED
    result = response.json()

    # 验证大图片应该生成缩略图
    file_info = result["file"]
    assert file_info["file_size"] > 0  # 确保有文件大小
    # 如果有缩略图字段，验证缩略图生成
    if "thumbnails" in file_info and file_info["thumbnails"]:
        assert isinstance(file_info["thumbnails"], dict)


@pytest.mark.asyncio
@pytest.mark.media
async def test_upload_small_image(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    small_image_data: bytes,
    api_urls: APIConfig,
):
    """测试上传小尺寸图片"""
    files = {"file": ("small.jpg", small_image_data, "image/jpeg")}
    data = {"usage": "avatar"}

    response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=admin_user_token_headers,
    )

    assert response.status_code == status.HTTP_201_CREATED
    result = response.json()

    file_info = result["file"]
    assert file_info["usage"] == "avatar"
    assert file_info["file_size"] < 1024 * 1024  # 小于1MB


@pytest.mark.asyncio
@pytest.mark.media
async def test_upload_without_authentication(
    async_client: AsyncClient, sample_image_data: bytes, api_urls: APIConfig
):
    """测试未认证用户上传文件"""
    files = {"file": ("test.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "general"}

    response = await async_client.post(
        api_urls.media_url("/upload"), files=files, data=data
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
@pytest.mark.media
async def test_upload_unsupported_file_type(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试上传不支持的文件类型"""
    # 创建一个假的可执行文件
    fake_exe_data = b"fake executable content"
    files = {"file": ("malware.exe", fake_exe_data, "application/x-executable")}
    data = {"usage": "general"}

    response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=admin_user_token_headers,
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    result = response.json()

    # 错误信息在 error.message 中
    error_message = result["error"]["message"]
    assert "不支持的文件类型" in error_message


@pytest.mark.asyncio
@pytest.mark.media
async def test_upload_oversized_file(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试上传超出大小限制的文件"""
    # 创建一个超大的假文件 (假设限制是10MB，创建15MB)
    oversized_data = b"x" * (15 * 1024 * 1024)
    files = {"file": ("huge.jpg", oversized_data, "image/jpeg")}
    data = {"usage": "general"}

    response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=admin_user_token_headers,
    )

    assert response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE  # 改为413

    result = response.json()

    # 错误信息在 error.message 中
    error_message = result["error"]["message"]
    assert "文件超出" in error_message


@pytest.mark.asyncio
@pytest.mark.media
async def test_upload_empty_file(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试上传空文件"""
    files = {"file": ("empty.jpg", b"", "image/jpeg")}
    data = {"usage": "general"}

    response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=admin_user_token_headers,
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.asyncio
@pytest.mark.media
async def test_upload_invalid_usage(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试无效的usage参数"""
    files = {"file": ("test.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "invalid_usage"}

    response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=admin_user_token_headers,
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
@pytest.mark.media
async def test_upload_with_all_optional_fields(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试包含所有可选字段的上传"""
    files = {"file": ("test.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "cover",
        "description": "这是一个详细的文件描述，包含中文字符",
        "alt_text": "图片的替代文本，用于无障碍访问",
    }

    response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=admin_user_token_headers,
    )

    assert response.status_code == status.HTTP_201_CREATED
    result = response.json()

    file_info = result["file"]
    assert file_info["usage"] == "cover"
    assert file_info["description"] == "这是一个详细的文件描述，包含中文字符"
    assert file_info["alt_text"] == "图片的替代文本，用于无障碍访问"


@pytest.mark.asyncio
@pytest.mark.media
async def test_upload_without_optional_fields(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试只包含必需字段的上传"""
    files = {"file": ("test.jpg", sample_image_data, "image/jpeg")}
    # 只传usage，其他字段使用默认值
    data = {"usage": "general"}

    response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=admin_user_token_headers,
    )

    assert response.status_code == status.HTTP_201_CREATED
    result = response.json()

    file_info = result["file"]
    assert file_info["usage"] == "general"
    assert file_info["description"] == ""  # 默认空字符串
    assert file_info["alt_text"] == ""  # 默认空字符串


@pytest.mark.asyncio
@pytest.mark.media
async def test_upload_missing_file(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试缺少文件参数的请求"""
    data = {"usage": "general"}

    response = await async_client.post(
        api_urls.media_url("/upload"), data=data, headers=admin_user_token_headers
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
@pytest.mark.media
async def test_upload_concurrent_files(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试多个文件上传（顺序执行以避免测试环境的会话冲突）

    注意：测试环境中所有请求共享同一个数据库会话以支持事务回滚，
    因此无法真正测试并发。生产环境中每个请求都有独立会话，不存在此问题。
    """
    # 顺序上传多个文件，每个文件内容不同以避免哈希去重
    for i in range(3):
        # 添加不同的后缀使每个文件内容不同
        unique_content = sample_image_data + str(i).encode()
        files = {"file": (f"concurrent_{i}.jpg", unique_content, "image/jpeg")}
        data = {"usage": "general", "description": f"多文件上传测试 - {i}"}

        response = await async_client.post(
            api_urls.media_url("/upload"),
            files=files,
            data=data,
            headers=admin_user_token_headers,
        )

        assert response.status_code == status.HTTP_201_CREATED
        result = response.json()
        assert f"concurrent_{i}" in result["file"]["original_filename"]
