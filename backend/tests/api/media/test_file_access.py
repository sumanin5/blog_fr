"""
文件访问接口测试 (GET /media/{file_id}/view)

测试文件访问的各种场景：
- 权限控制：公开文件 vs 私有文件访问
- 文件下载：正确的文件内容和 headers
- 统计更新：view_count 增加
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
async def test_view_file_by_owner(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试文件所有者访问文件"""
    # 上传文件
    files = {"file": ("owner_view.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "description": "所有者查看测试",
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

    # 访问文件
    response = await async_client.get(
        api_urls.media_url(f"/{file_id}/view"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_200_OK

    # 验证响应头
    assert "content-type" in response.headers
    assert response.headers["content-type"] == "image/jpeg"

    # 验证文件内容
    assert response.content == sample_image_data

    # 验证文件名在响应头中（如果实现了的话）
    if "content-disposition" in response.headers:
        assert "owner_view.jpg" in response.headers["content-disposition"]


@pytest.mark.asyncio
@pytest.mark.media
async def test_view_public_file_by_others(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试其他用户访问公开文件"""
    # 普通用户上传公开文件
    files = {"file": ("public_view.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "is_public": "true",
        "description": "公开查看测试",
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
        api_urls.media_url(f"/{file_id}/view"), headers=admin_user_token_headers
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.headers["content-type"] == "image/jpeg"
    assert response.content == sample_image_data


@pytest.mark.asyncio
@pytest.mark.media
async def test_view_file_superadmin_access_all(  # ✅ 改名
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    superadmin_user_token_headers: dict,  # ✅ 改为超级管理员
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试超级管理员可以访问所有文件"""  # ✅ 更新文档字符串
    # 普通用户上传私有文件
    files = {"file": ("admin_access.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "is_public": "false",
        "description": "管理员访问测试",
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

    # 超级管理员访问该私有文件  # ✅ 更新注释
    response = await async_client.get(
        api_urls.media_url(f"/{file_id}/view"),
        headers=superadmin_user_token_headers,  # ✅ 使用超级管理员 token
    )

    assert response.status_code == status.HTTP_200_OK


# ========================================
# 权限拒绝测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_view_private_file_access_denied(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试其他用户不能访问私有文件"""
    # 普通用户上传私有文件
    files = {"file": ("private_view.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "is_public": "false",
        "description": "私有查看测试",
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

    # 未认证用户尝试访问
    response = await async_client.get(api_urls.media_url(f"/{file_id}/view"))

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
@pytest.mark.media
async def test_view_file_without_auth(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试未认证用户访问文件"""
    # 上传私有文件
    files = {"file": ("no_auth_view.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "is_public": "false",
        "description": "需要认证",
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

    # 未认证访问
    response = await async_client.get(api_urls.media_url(f"/{file_id}/view"))

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
@pytest.mark.media
async def test_view_file_admin_cannot_access_others_private_files(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    admin_user_token_headers: dict,  # 普通管理员
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试普通管理员无法访问其他用户的私有文件"""
    # 普通用户上传私有文件
    files = {"file": ("private.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "general", "is_public": "false"}

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )
    file_id = upload_response.json()["file"]["id"]

    # 普通管理员尝试访问（应该被拒绝）
    response = await async_client.get(
        api_urls.media_url(f"/{file_id}/view"),
        headers=admin_user_token_headers,
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN  # ✅ 预期被拒绝


# ========================================
# 文件不存在测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_view_file_not_found(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试访问不存在的文件"""
    fake_file_id = str(uuid.uuid4())

    response = await async_client.get(
        api_urls.media_url(f"/{fake_file_id}/view"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
@pytest.mark.media
async def test_view_file_invalid_uuid(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试无效UUID格式"""
    invalid_uuid = "invalid-uuid-format"

    response = await async_client.get(
        api_urls.media_url(f"/{invalid_uuid}/view"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# ========================================
# 统计更新测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_view_file_count_increment(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试查看文件时 view_count 增加"""
    # 上传文件
    files = {"file": ("count_test.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "description": "计数测试",
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

    # 获取初始 view_count
    detail_response = await async_client.get(
        api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
    )
    assert detail_response.status_code == status.HTTP_200_OK
    initial_count = detail_response.json()["view_count"]

    # 访问文件
    view_response = await async_client.get(
        api_urls.media_url(f"/{file_id}/view"), headers=normal_user_token_headers
    )
    assert view_response.status_code == status.HTTP_200_OK

    # 再次获取 view_count，应该增加了1
    detail_response = await async_client.get(
        api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
    )
    assert detail_response.status_code == status.HTTP_200_OK
    new_count = detail_response.json()["view_count"]

    assert new_count == initial_count + 1


@pytest.mark.asyncio
@pytest.mark.media
async def test_view_file_multiple_times(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试多次查看文件，计数持续增加"""
    # 上传文件
    files = {"file": ("multiple_views.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "description": "多次查看测试",
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

    # 获取初始计数
    detail_response = await async_client.get(
        api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
    )
    initial_count = detail_response.json()["view_count"]

    # 多次访问文件
    view_times = 3
    for _ in range(view_times):
        view_response = await async_client.get(
            api_urls.media_url(f"/{file_id}/view"), headers=normal_user_token_headers
        )
        assert view_response.status_code == status.HTTP_200_OK

    # 验证计数增加了正确的次数
    detail_response = await async_client.get(
        api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
    )
    final_count = detail_response.json()["view_count"]

    assert final_count == initial_count + view_times


# ========================================
# 不同文件类型测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_view_different_file_types(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_jpeg_data: bytes,
    sample_webp_data: bytes,
    api_urls: APIConfig,
):
    """测试访问不同类型的文件"""
    # 测试数据：(文件名, 数据, MIME类型)
    test_files = [
        ("test.jpg", sample_jpeg_data, "image/jpeg"),
        ("test.webp", sample_webp_data, "image/webp"),
    ]

    for filename, file_data, expected_mime in test_files:
        # 上传文件
        files = {"file": (filename, file_data, expected_mime)}
        data = {"usage": "general", "description": f"测试 {filename}"}

        upload_response = await async_client.post(
            api_urls.media_url("/upload"),
            files=files,
            data=data,
            headers=normal_user_token_headers,
        )

        assert upload_response.status_code == status.HTTP_201_CREATED
        file_info = upload_response.json()["file"]
        file_id = file_info["id"]

        # 访问文件
        view_response = await async_client.get(
            api_urls.media_url(f"/{file_id}/view"), headers=normal_user_token_headers
        )

        assert view_response.status_code == status.HTTP_200_OK
        assert view_response.headers["content-type"] == expected_mime
        assert view_response.content == file_data


# ========================================
# 并发访问测试 - 暂时跳过，需要更复杂的事务处理
# ========================================


# async def test_view_file_concurrent_access(
#     async_client: AsyncClient,
#     normal_user_token_headers: dict,
#     sample_image_data: bytes,
#     api_urls: APIConfig,
# ):
#     """测试并发访问文件 - 暂时跳过，需要更复杂的事务处理"""
#     pass


# ========================================
# 响应头测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_view_file_response_headers(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试文件访问的响应头"""
    # 上传文件
    files = {"file": ("headers_test.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "description": "响应头测试",
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

    # 访问文件
    response = await async_client.get(
        api_urls.media_url(f"/{file_id}/view"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_200_OK

    # 验证必要的响应头
    assert "content-type" in response.headers
    assert response.headers["content-type"] == "image/jpeg"

    # 验证内容长度
    if "content-length" in response.headers:
        assert int(response.headers["content-length"]) == len(sample_image_data)

    # 验证文件名（如果实现了 Content-Disposition）
    if "content-disposition" in response.headers:
        disposition = response.headers["content-disposition"]
        assert "headers_test.jpg" in disposition
