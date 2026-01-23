"""
批量删除接口测试 (POST /media/batch-delete)

测试批量删除的各种场景：
- 成功删除：所有者批量删除自己的文件
- 权限测试：不能删除别人的文件
- 混合场景：部分文件有权限，部分没有
- 超级管理员：可以删除任何文件
"""

import uuid

import pytest
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig

# ========================================
# 成功删除测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_batch_delete_own_files(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试批量删除自己的文件"""
    # 上传3个文件
    file_ids = []
    for i in range(3):
        files = {
            "file": (
                f"batch_test_{i}.jpg",
                sample_image_data + str(i).encode(),
                "image/jpeg",
            )
        }
        data = {"usage": "general", "description": f"批量删除测试 {i}"}

        upload_response = await async_client.post(
            api_urls.media_url("/upload"),
            files=files,
            data=data,
            headers=normal_user_token_headers,
        )

        assert upload_response.status_code == status.HTTP_201_CREATED
        file_info = upload_response.json()["file"]
        file_ids.append(file_info["id"])

    # 批量删除
    response = await async_client.post(
        api_urls.media_url("/batch-delete"),
        json={"file_ids": file_ids},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert result["deleted_count"] == 3
    assert "批量删除完成" in result["message"]

    # 验证所有文件都被删除
    for file_id in file_ids:
        get_response = await async_client.get(
            api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
        )
        assert get_response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
@pytest.mark.media
async def test_batch_delete_empty_list(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试批量删除空列表"""
    response = await async_client.post(
        api_urls.media_url("/batch-delete"),
        json={"file_ids": []},
        headers=normal_user_token_headers,
    )

    # 空列表应该返回422验证错误（min_length=1）
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
@pytest.mark.media
async def test_batch_delete_single_file(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试批量删除单个文件"""
    # 上传1个文件
    files = {"file": ("single_batch.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "general"}

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    file_id = upload_response.json()["file"]["id"]

    # 批量删除（只有1个）
    response = await async_client.post(
        api_urls.media_url("/batch-delete"),
        json={"file_ids": [file_id]},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert result["deleted_count"] == 1


# ========================================
# 权限拒绝测试 - 关键安全测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_batch_delete_others_files_forbidden(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """🚨 安全测试：不能批量删除别人的文件"""
    # 用户A上传文件
    files = {"file": ("user_a_file.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "general"}

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    file_id = upload_response.json()["file"]["id"]

    # 用户B（管理员）尝试删除用户A的文件
    response = await async_client.post(
        api_urls.media_url("/batch-delete"),
        json={"file_ids": [file_id]},
        headers=admin_user_token_headers,
    )

    # 应该返回权限错误
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # 验证文件仍然存在
    get_response = await async_client.get(
        api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
    )
    assert get_response.status_code == status.HTTP_200_OK


@pytest.mark.asyncio
@pytest.mark.media
async def test_batch_delete_mixed_ownership(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """🚨 安全测试：混合所有权 - 部分是自己的，部分是别人的"""
    # 用户A上传2个文件
    user_a_file_ids = []
    for i in range(2):
        files = {
            "file": (
                f"user_a_{i}.jpg",
                sample_image_data + str(i).encode(),
                "image/jpeg",
            )
        }
        data = {"usage": "general"}

        upload_response = await async_client.post(
            api_urls.media_url("/upload"),
            files=files,
            data=data,
            headers=normal_user_token_headers,
        )

        assert upload_response.status_code == status.HTTP_201_CREATED
        user_a_file_ids.append(upload_response.json()["file"]["id"])

    # 用户B（管理员）上传1个文件
    files = {"file": ("user_b.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "general"}

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=admin_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    user_b_file_id = upload_response.json()["file"]["id"]

    # 用户B尝试删除：自己的1个 + 用户A的2个
    all_file_ids = user_a_file_ids + [user_b_file_id]

    response = await async_client.post(
        api_urls.media_url("/batch-delete"),
        json={"file_ids": all_file_ids},
        headers=admin_user_token_headers,
    )

    # 应该返回权限错误（因为有用户A的文件）
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # 验证所有文件仍然存在（原子性：全部成功或全部失败）
    for file_id in all_file_ids:
        # 用各自的token检查
        if file_id in user_a_file_ids:
            get_response = await async_client.get(
                api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
            )
        else:
            get_response = await async_client.get(
                api_urls.media_url(f"/{file_id}"), headers=admin_user_token_headers
            )
        assert get_response.status_code == status.HTTP_200_OK


@pytest.mark.asyncio
@pytest.mark.media
async def test_batch_delete_without_auth(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试未认证用户不能批量删除"""
    # 上传文件
    files = {"file": ("auth_test.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "general"}

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    file_id = upload_response.json()["file"]["id"]

    # 未认证尝试批量删除
    response = await async_client.post(
        api_urls.media_url("/batch-delete"),
        json={"file_ids": [file_id]},
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ========================================
# 超级管理员测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_batch_delete_superadmin_can_delete_any(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    superadmin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试超级管理员可以删除任何文件"""
    # 普通用户上传文件
    files = {"file": ("user_file.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "general"}

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    file_id = upload_response.json()["file"]["id"]

    # 超级管理员批量删除
    response = await async_client.post(
        api_urls.media_url("/batch-delete"),
        json={"file_ids": [file_id]},
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert result["deleted_count"] == 1

    # 验证文件被删除
    get_response = await async_client.get(
        api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
    )
    assert get_response.status_code == status.HTTP_404_NOT_FOUND


# ========================================
# 文件不存在测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_batch_delete_nonexistent_files(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试批量删除不存在的文件"""
    fake_file_ids = [str(uuid.uuid4()), str(uuid.uuid4())]

    response = await async_client.post(
        api_urls.media_url("/batch-delete"),
        json={"file_ids": fake_file_ids},
        headers=normal_user_token_headers,
    )

    # 可能返回200但deleted_count=0，或者返回404
    # 取决于实现，这里假设返回200
    assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]
    if response.status_code == status.HTTP_200_OK:
        result = response.json()
        assert result["deleted_count"] == 0


@pytest.mark.asyncio
@pytest.mark.media
async def test_batch_delete_partial_nonexistent(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试批量删除：部分存在，部分不存在"""
    # 上传1个真实文件
    files = {"file": ("real_file.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "general"}

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=normal_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    real_file_id = upload_response.json()["file"]["id"]

    # 混合真实和虚假ID
    fake_file_id = str(uuid.uuid4())
    mixed_ids = [real_file_id, fake_file_id]

    response = await async_client.post(
        api_urls.media_url("/batch-delete"),
        json={"file_ids": mixed_ids},
        headers=normal_user_token_headers,
    )

    # 应该只删除存在的文件
    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert result["deleted_count"] == 1


# ========================================
# 数据验证测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_batch_delete_invalid_uuid_format(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试无效的UUID格式"""
    response = await async_client.post(
        api_urls.media_url("/batch-delete"),
        json={"file_ids": ["invalid-uuid", "also-invalid"]},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
@pytest.mark.media
async def test_batch_delete_missing_file_ids(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试缺少file_ids字段"""
    response = await async_client.post(
        api_urls.media_url("/batch-delete"),
        json={},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# ========================================
# 原子性测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.media
async def test_batch_delete_atomicity(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    admin_user_token_headers: dict,
    sample_image_data: bytes,
    api_urls: APIConfig,
):
    """测试批量删除的原子性：全部成功或全部失败"""
    # 用户A上传2个文件
    user_a_file_ids = []
    for i in range(2):
        files = {
            "file": (
                f"atomic_a_{i}.jpg",
                sample_image_data + str(i).encode(),
                "image/jpeg",
            )
        }
        data = {"usage": "general"}

        upload_response = await async_client.post(
            api_urls.media_url("/upload"),
            files=files,
            data=data,
            headers=normal_user_token_headers,
        )

        assert upload_response.status_code == status.HTTP_201_CREATED
        user_a_file_ids.append(upload_response.json()["file"]["id"])

    # 用户B上传1个文件
    files = {"file": ("atomic_b.jpg", sample_image_data, "image/jpeg")}
    data = {"usage": "general"}

    upload_response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        data=data,
        headers=admin_user_token_headers,
    )

    assert upload_response.status_code == status.HTTP_201_CREATED
    user_b_file_id = upload_response.json()["file"]["id"]

    # 用户A尝试删除：自己的2个 + 用户B的1个
    all_ids = user_a_file_ids + [user_b_file_id]

    response = await async_client.post(
        api_urls.media_url("/batch-delete"),
        json={"file_ids": all_ids},
        headers=normal_user_token_headers,
    )

    # 应该失败（因为有用户B的文件）
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # 验证用户A的文件也没有被删除（原子性）
    for file_id in user_a_file_ids:
        get_response = await async_client.get(
            api_urls.media_url(f"/{file_id}"), headers=normal_user_token_headers
        )
        assert get_response.status_code == status.HTTP_200_OK

    # 验证用户B的文件也没有被删除
    get_response = await async_client.get(
        api_urls.media_url(f"/{user_b_file_id}"), headers=admin_user_token_headers
    )
    assert get_response.status_code == status.HTTP_200_OK
