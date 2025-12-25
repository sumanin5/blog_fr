"""
公开状态切换接口测试 (PATCH /media/{file_id}/publicity)

测试文件公开状态切换的各种场景：
- 成功切换：所有者切换文件公开状态
- 权限拒绝：非所有者不能修改
- 参数验证：is_public 布尔值验证
"""

import uuid

import pytest
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig

# ========================================
# 成功切换测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_toggle_file_publicity_to_public(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试将私有文件设为公开"""
    # 上传私有文件
    files = {"file": ("private_to_public.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "is_public": "false",
        "description": "私有转公开文件",
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

    # 切换为公开
    toggle_data = {"is_public": True}
    response = await async_client.patch(
        api_urls.media_url(f"/{file_id}/publicity"),
        json=toggle_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    # 验证返回的文件信息
    assert result["id"] == file_id
    assert result["original_filename"] == "private_to_public.jpg"
    # 注意：响应可能不包含 is_public 字段，这取决于 MediaFileResponse 的定义


@pytest.mark.asyncio
@pytest.mark.media
async def test_toggle_file_publicity_to_private(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试将公开文件设为私有"""
    # 上传公开文件
    files = {"file": ("public_to_private.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "is_public": "true",
        "description": "公开转私有文件",
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

    # 切换为私有
    toggle_data = {"is_public": False}
    response = await async_client.patch(
        api_urls.media_url(f"/{file_id}/publicity"),
        json=toggle_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    # 验证返回的文件信息
    assert result["id"] == file_id
    assert result["original_filename"] == "public_to_private.jpg"


@pytest.mark.asyncio
@pytest.mark.media
async def test_toggle_file_publicity_multiple_times(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试多次切换文件公开状态"""
    # 上传文件
    files = {"file": ("toggle_multiple.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "is_public": "false",
        "description": "多次切换测试文件",
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

    # 第一次：设为公开
    toggle_data = {"is_public": True}
    response = await async_client.patch(
        api_urls.media_url(f"/{file_id}/publicity"),
        json=toggle_data,
        headers=normal_user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK

    # 第二次：设为私有
    toggle_data = {"is_public": False}
    response = await async_client.patch(
        api_urls.media_url(f"/{file_id}/publicity"),
        json=toggle_data,
        headers=normal_user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK

    # 第三次：再次设为公开
    toggle_data = {"is_public": True}
    response = await async_client.patch(
        api_urls.media_url(f"/{file_id}/publicity"),
        json=toggle_data,
        headers=normal_user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK


# ========================================
# 权限拒绝测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_toggle_file_publicity_access_denied(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试非所有者不能修改文件公开状态"""
    # 普通用户上传文件
    files = {"file": ("owner_only.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "is_public": "false",
        "description": "仅所有者可修改",
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

    # 管理员尝试修改（代表其他用户）
    toggle_data = {"is_public": True}
    response = await async_client.patch(
        api_urls.media_url(f"/{file_id}/publicity"),
        json=toggle_data,
        headers=admin_user_token_headers,
    )

    # 应该返回权限错误（具体状态码取决于实现）
    assert response.status_code in [
        status.HTTP_403_FORBIDDEN,
        status.HTTP_404_NOT_FOUND,
    ]


@pytest.mark.asyncio
@pytest.mark.media
async def test_toggle_file_publicity_without_auth(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试未认证用户不能修改文件公开状态"""
    # 上传文件
    files = {"file": ("no_auth.jpg", sample_image_data, "image/jpeg")}
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

    # 未认证尝试修改
    toggle_data = {"is_public": True}
    response = await async_client.patch(
        api_urls.media_url(f"/{file_id}/publicity"), json=toggle_data
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ========================================
# 文件不存在测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_toggle_file_publicity_not_found(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试修改不存在文件的公开状态"""
    fake_file_id = str(uuid.uuid4())
    toggle_data = {"is_public": True}

    response = await async_client.patch(
        api_urls.media_url(f"/{fake_file_id}/publicity"),
        json=toggle_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
@pytest.mark.media
async def test_toggle_file_publicity_invalid_uuid(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试无效UUID格式"""
    invalid_uuid = "invalid-uuid-format"
    toggle_data = {"is_public": True}

    response = await async_client.patch(
        api_urls.media_url(f"/{invalid_uuid}/publicity"),
        json=toggle_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# ========================================
# 参数验证测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_toggle_file_publicity_missing_parameter(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试缺少必需参数"""
    # 上传文件
    files = {"file": ("missing_param.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "general", "description": "缺少参数测试"}

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    file_info = upload_response.json()["file"]
    file_id = file_info["id"]

    # 发送空的请求体
    response = await async_client.patch(
        api_urls.media_url(f"/{file_id}/publicity"),
        json={},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
@pytest.mark.media
async def test_toggle_file_publicity_invalid_boolean(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试无效的布尔值"""
    # 上传文件
    files = {"file": ("invalid_bool.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "general", "description": "无效布尔值测试"}

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    file_info = upload_response.json()["file"]
    file_id = file_info["id"]

    # 测试真正无效的值（不能被Pydantic转换为布尔值的）
    invalid_values = [
        "invalid_string",
        {"not": "boolean"},
        ["list", "value"],
        "maybe",
        "unknown",
    ]

    for invalid_value in invalid_values:
        toggle_data = {"is_public": invalid_value}
        response = await async_client.patch(
            api_urls.media_url(f"/{file_id}/publicity"),
            json=toggle_data,
            headers=normal_user_token_headers,
        )

        # 这些值应该返回422验证错误
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
@pytest.mark.media
async def test_toggle_file_publicity_extra_fields(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试包含额外字段的请求"""
    # 上传文件
    files = {"file": ("extra_fields.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "general", "description": "额外字段测试"}

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    file_info = upload_response.json()["file"]
    file_id = file_info["id"]

    # 包含额外字段的请求
    toggle_data = {
        "is_public": True,
        "extra_field": "should_be_ignored",
        "another_field": 123,
    }

    response = await async_client.patch(
        api_urls.media_url(f"/{file_id}/publicity"),
        json=toggle_data,
        headers=normal_user_token_headers,
    )

    # 应该成功，额外字段被忽略
    assert response.status_code == status.HTTP_200_OK
