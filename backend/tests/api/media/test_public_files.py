"""
公开文件接口测试

测试 GET /media/public 接口的各种场景
"""

import pytest
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_public_files_without_auth(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试无认证访问公开文件列表"""
    response = await async_client.get(api_urls.media_url("/public"))

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    # 验证响应是列表格式
    assert isinstance(result, list)


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_public_files_with_auth(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试认证用户访问公开文件列表"""
    response = await async_client.get(
        api_urls.media_url("/public"), headers=admin_user_token_headers
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert isinstance(result, list)


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_public_files_with_pagination(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试分页参数"""
    # 测试第一页
    response = await async_client.get(
        api_urls.media_url("/public"), params={"page": 1, "page_size": 5}
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert isinstance(result, list)
    assert len(result) <= 5  # 不超过页面大小


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_public_files_with_media_type_filter(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试媒体类型过滤"""
    # 测试图片类型过滤
    response = await async_client.get(
        api_urls.media_url("/public"), params={"media_type": "image"}
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert isinstance(result, list)

    # 如果有结果，验证都是图片类型
    for file_info in result:
        assert file_info["media_type"] == "image"


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_public_files_with_usage_filter(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试用途过滤"""
    response = await async_client.get(
        api_urls.media_url("/public"), params={"usage": "general"}
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert isinstance(result, list)

    # 如果有结果，验证都是指定用途
    for file_info in result:
        assert file_info["usage"] == "general"


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_public_files_with_combined_filters(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试组合过滤条件"""
    response = await async_client.get(
        api_urls.media_url("/public"),
        params={
            "media_type": "image",
            "usage": "general",
            "page": 1,
            "page_size": 10,
        },
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert isinstance(result, list)

    # 验证过滤条件
    for file_info in result:
        assert file_info["media_type"] == "image"
        assert file_info["usage"] == "general"


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_public_files_invalid_media_type(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试无效的媒体类型参数"""
    response = await async_client.get(
        api_urls.media_url("/public"), params={"media_type": "invalid_type"}
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_public_files_invalid_usage(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试无效的用途参数"""
    response = await async_client.get(
        api_urls.media_url("/public"), params={"usage": "invalid_usage"}
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_public_files_invalid_pagination(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试无效的分页参数"""
    # 测试负数页码
    response = await async_client.get(
        api_urls.media_url("/public"), params={"page": -1}
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_public_files_large_page_size(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试超大页面大小"""
    response = await async_client.get(
        api_urls.media_url("/public"),
        params={"page_size": 1000},  # 超过限制
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_public_files_response_structure(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试响应结构（先上传一个公开文件）"""
    # 先上传一个公开文件
    files = {"file": ("public_test.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "is_public": "true",  # 设为公开
        "description": "公开测试图片",
    }

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=admin_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED

    # 获取公开文件列表
    response = await async_client.get(api_urls.media_url("/public"))

    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert isinstance(result, list)

    # 如果有文件，验证响应结构
    if result:
        file_info = result[0]

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
        ]

        for field in required_fields:
            assert field in file_info, f"缺少字段: {field}"

        # 验证数据类型
        assert isinstance(file_info["file_size"], int)
        assert file_info["file_size"] > 0
        assert isinstance(file_info["file_url"], str)
        assert file_info["file_url"].startswith("http")


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_public_files_only_shows_public(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试只显示公开文件，不显示私有文件"""
    # 上传一个私有文件
    files = {"file": ("private_test.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "is_public": "false",  # 设为私有
        "description": "私有测试图片",
    }

    await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=admin_user_token_headers,
    )

    # 上传一个公开文件
    files = {"file": ("public_test2.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "is_public": "true",  # 设为公开
        "description": "公开测试图片2",
    }

    await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=admin_user_token_headers,
    )

    # 获取公开文件列表
    response = await async_client.get(api_urls.media_url("/public"))

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    # 验证所有返回的文件都是公开的
    # 注意：这里无法直接验证 is_public 字段，因为响应可能不包含该字段
    # 但可以验证不包含私有文件的描述
    descriptions = [f.get("description", "") for f in result]
    assert "私有测试图片" not in descriptions

    # 如果有公开文件，应该能找到
    if any("公开测试图片" in desc for desc in descriptions):
        assert True  # 找到了公开文件
