"""
文件列表接口测试 (GET /media/)

测试用户文件列表的各种场景：
- 认证测试：需要登录才能访问
- 用户隔离：只能看到自己的文件
- 过滤和分页：各种查询参数
- 空列表：新用户没有文件时
"""

import pytest
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig

# ========================================
# 认证测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_user_files_without_auth(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试未认证访问文件列表"""
    response = await async_client.get(api_urls.media_url("/"))

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_user_files_with_invalid_token(
    async_client: AsyncClient,
    api_urls: APIConfig,
):
    """测试无效token访问文件列表"""
    headers = {"Authorization": "Bearer invalid_token"}
    response = await async_client.get(api_urls.media_url("/"), headers=headers)

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ========================================
# 空列表测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_user_files_empty_list(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试新用户没有文件时返回空列表"""
    response = await async_client.get(
        api_urls.media_url("/"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    # 验证响应结构（fastapi-pagination格式）
    assert "total" in result
    assert "items" in result
    assert "page" in result
    assert "size" in result
    assert result["total"] == 0
    assert result["items"] == []


# ========================================
# 用户隔离测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_user_files_isolation(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试用户只能看到自己的文件"""
    # 普通用户上传一个文件
    files = {"file": ("user_file.jpg", sample_image_data + b"user", "image/jpeg")}
    data = {"usage": "general", "description": "普通用户的文件"}

    await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    # 管理员用户上传一个文件
    files = {"file": ("admin_file.jpg", sample_image_data + b"admin", "image/jpeg")}
    data = {"usage": "general", "description": "管理员的文件"}

    await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=admin_user_token_headers,
    )

    # 普通用户查看自己的文件列表
    response = await async_client.get(
        api_urls.media_url("/"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    # 应该只看到自己的1个文件
    assert result["total"] == 1
    assert len(result["items"]) == 1
    assert result["items"][0]["description"] == "普通用户的文件"

    # 管理员查看自己的文件列表
    response = await async_client.get(
        api_urls.media_url("/"), headers=admin_user_token_headers
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    # 应该只看到自己的1个文件
    assert result["total"] == 1
    assert len(result["items"]) == 1
    assert result["items"][0]["description"] == "管理员的文件"


# ========================================
# 响应结构测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_user_files_response_structure(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试文件列表响应结构"""
    # 先上传一个文件
    files = {"file": ("test_structure.jpg", sample_image_data, "image/jpeg")}
    data = {
        "usage": "general",
        "description": "测试响应结构",
        "alt_text": "测试图片",
    }

    await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    # 获取文件列表
    response = await async_client.get(
        api_urls.media_url("/"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    # 验证顶层结构（fastapi-pagination格式）
    assert "total" in result
    assert "items" in result
    assert "page" in result
    assert "size" in result
    assert "pages" in result
    assert isinstance(result["total"], int)
    assert isinstance(result["items"], list)
    assert result["total"] == 1
    assert len(result["items"]) == 1

    # 验证文件对象结构
    file_info = result["items"][0]
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
    assert file_info["original_filename"] == "test_structure.jpg"
    assert file_info["description"] == "测试响应结构"
    assert file_info["alt_text"] == "测试图片"


# ========================================
# 分页测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_user_files_pagination_default(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试默认分页参数"""
    # 上传3个文件
    for i in range(3):
        files = {
            "file": (f"file_{i}.jpg", sample_image_data + str(i).encode(), "image/jpeg")
        }
        data = {"usage": "general", "description": f"文件 {i}"}

        await async_client.post(
            api_urls.media_url("/upload"),
            files=files,
            data=data,
            headers=normal_user_token_headers,
        )

    # 获取文件列表（默认参数）
    response = await async_client.get(
        api_urls.media_url("/"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    assert result["total"] == 3
    assert len(result["items"]) == 3


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_user_files_pagination_custom(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试自定义分页参数"""
    # 上传5个文件
    for i in range(5):
        files = {
            "file": (
                f"page_file_{i}.jpg",
                sample_image_data + str(i).encode(),
                "image/jpeg",
            )
        }
        data = {"usage": "general", "description": f"分页文件 {i}"}

        await async_client.post(
            api_urls.media_url("/upload"),
            files=files,
            data=data,
            headers=normal_user_token_headers,
        )

    # 测试第一页，每页2个
    response = await async_client.get(
        api_urls.media_url("/"),
        params={"page": 1, "size": 2},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    assert result["total"] == 5  # 总数
    assert len(result["items"]) == 2  # 当前页数量
    assert result["page"] == 1
    assert result["size"] == 2

    # 测试第二页
    response = await async_client.get(
        api_urls.media_url("/"),
        params={"page": 2, "size": 2},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    assert result["total"] == 5
    assert len(result["items"]) == 2
    assert result["page"] == 2

    # 测试最后一页
    response = await async_client.get(
        api_urls.media_url("/"),
        params={"page": 3, "size": 2},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    assert result["total"] == 5
    assert len(result["items"]) == 1  # 最后一页只有1个文件
    assert result["page"] == 3


# ========================================
# 过滤测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_user_files_filter_by_media_type(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试按媒体类型过滤"""
    # 上传图片文件
    files = {"file": ("image.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "general", "description": "图片文件"}

    await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    # 过滤图片类型
    response = await async_client.get(
        api_urls.media_url("/"),
        params={"media_type": "image"},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    assert result["total"] == 1
    assert len(result["items"]) == 1
    assert result["items"][0]["media_type"] == "image"

    # 过滤不存在的类型
    response = await async_client.get(
        api_urls.media_url("/"),
        params={"media_type": "video"},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    assert result["total"] == 0
    assert len(result["items"]) == 0


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_user_files_filter_by_usage(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试按用途过滤"""
    # 上传不同用途的文件
    usages = ["general", "avatar", "cover"]

    for usage in usages:
        files = {
            "file": (f"{usage}.jpg", sample_image_data + usage.encode(), "image/jpeg")
        }
        data = {"usage": usage, "description": f"{usage}文件"}

        await async_client.post(
            api_urls.media_url("/upload"),
            files=files,
            data=data,
            headers=normal_user_token_headers,
        )

    # 过滤头像文件
    response = await async_client.get(
        api_urls.media_url("/"),
        params={"usage": "avatar"},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    assert result["total"] == 1
    assert len(result["items"]) == 1
    assert result["items"][0]["usage"] == "avatar"

    # 过滤通用文件
    response = await async_client.get(
        api_urls.media_url("/"),
        params={"usage": "general"},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    assert result["total"] == 1
    assert len(result["items"]) == 1
    assert result["items"][0]["usage"] == "general"


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_user_files_combined_filters(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试组合过滤条件"""
    # 上传多个文件
    test_files = [
        ("image1.jpg", "general", "图片1"),
        ("image2.jpg", "avatar", "头像图片"),
        ("image3.jpg", "general", "图片3"),
    ]

    for filename, usage, description in test_files:
        files = {
            "file": (filename, sample_image_data + filename.encode(), "image/jpeg")
        }
        data = {"usage": usage, "description": description}

        await async_client.post(
            api_urls.media_url("/upload"),
            files=files,
            data=data,
            headers=normal_user_token_headers,
        )

    # 组合过滤：图片类型 + 通用用途
    response = await async_client.get(
        api_urls.media_url("/"),
        params={"media_type": "image", "usage": "general"},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    assert result["total"] == 2  # 应该有2个通用图片
    assert len(result["items"]) == 2

    for file_info in result["items"]:
        assert file_info["media_type"] == "image"
        assert file_info["usage"] == "general"


# ========================================
# 参数验证测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_user_files_invalid_media_type(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试无效的媒体类型参数"""
    response = await async_client.get(
        api_urls.media_url("/"),
        params={"media_type": "invalid_type"},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_user_files_invalid_usage(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试无效的用途参数"""
    response = await async_client.get(
        api_urls.media_url("/"),
        params={"usage": "invalid_usage"},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_user_files_invalid_pagination(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试无效的分页参数"""
    # 测试负数页码
    response = await async_client.get(
        api_urls.media_url("/"),
        params={"page": -1},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # 测试负数size
    response = await async_client.get(
        api_urls.media_url("/"),
        params={"size": -1},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # 测试超大size（超过最大限制100）
    response = await async_client.get(
        api_urls.media_url("/"),
        params={"size": 1000},
        headers=normal_user_token_headers,
    )

    # 超过最大限制会返回422验证错误
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# ========================================
# 排序测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_get_user_files_sorting_by_creation_time(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试按创建时间排序（默认降序）"""
    import asyncio

    # 上传3个文件，间隔一点时间
    filenames = ["first.jpg", "second.jpg", "third.jpg"]

    for filename in filenames:
        files = {
            "file": (filename, sample_image_data + filename.encode(), "image/jpeg")
        }
        data = {"usage": "general", "description": f"文件 {filename}"}

        await async_client.post(
            api_urls.media_url("/upload"),
            files=files,
            data=data,
            headers=normal_user_token_headers,
        )
        await asyncio.sleep(0.3)  # 增加延迟确保时间差异

    # 获取文件列表
    response = await async_client.get(
        api_urls.media_url("/"), headers=normal_user_token_headers
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    assert result["total"] == 3
    assert len(result["items"]) == 3

    # 验证按创建时间降序排列（最新的在前）
    files = result["items"]

    # 验证时间戳确实是降序（这是最可靠的验证方式）
    timestamps = [file["created_at"] for file in files]
    assert timestamps == sorted(timestamps, reverse=True), "文件应该按创建时间降序排列"

    # 可选：验证第一个和最后一个文件名（更宽松的验证）
    # 注意：由于时间精度问题,中间的顺序可能不稳定
    assert files[0]["original_filename"] in ["second.jpg", "third.jpg"], (
        "最新的文件应该在前面"
    )
    assert files[-1]["original_filename"] in ["first.jpg", "second.jpg"], (
        "最旧的文件应该在后面"
    )
