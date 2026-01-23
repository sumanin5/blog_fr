"""
媒体文件搜索接口测试
"""

import pytest
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig


@pytest.mark.asyncio
@pytest.mark.media
async def test_search_by_filename(
    async_client: AsyncClient,
    api_urls: APIConfig,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
):
    """测试按文件名搜索"""
    # 上传测试图片
    files = {"file": ("test_photo.jpg", sample_image_data, "image/jpeg")}
    response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        headers=normal_user_token_headers,
    )
    assert response.status_code == status.HTTP_201_CREATED

    # 搜索 "photo"
    response = await async_client.get(
        api_urls.media_url("/"),
        params={"q": "photo"},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert result["total"] > 0
    files_list = result["items"]
    assert len(files_list) > 0
    assert "photo" in files_list[0]["original_filename"].lower()


@pytest.mark.asyncio
@pytest.mark.media
async def test_search_chinese_characters(
    async_client: AsyncClient,
    api_urls: APIConfig,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
):
    """测试中文关键词搜索"""
    # 上传带中文名的文件
    files = {"file": ("千反田.jpg", sample_image_data, "image/jpeg")}
    response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_201_CREATED
    file_id = response.json()["file"]["id"]

    # 使用中文搜索
    response = await async_client.get(
        api_urls.media_url("/"),
        params={"q": "千反田"},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    files_list = result["items"]
    assert len(files_list) > 0

    found = any(
        f["id"] == file_id and "千反田" in f["original_filename"] for f in files_list
    )
    assert found, "应该能找到中文文件名的文件"


@pytest.mark.asyncio
@pytest.mark.media
async def test_search_no_results(
    async_client: AsyncClient,
    api_urls: APIConfig,
    normal_user_token_headers: dict,
    sample_image_data: bytes,
):
    """测试搜索不存在的内容"""
    # 上传一个文件
    files = {"file": ("photo.jpg", sample_image_data, "image/jpeg")}
    response = await async_client.post(
        api_urls.media_url("/upload"),
        files=files,
        headers=normal_user_token_headers,
    )
    assert response.status_code == status.HTTP_201_CREATED

    # 搜索一个不存在的关键词
    response = await async_client.get(
        api_urls.media_url("/"),
        params={"q": "这个关键词完全不存在xyzabc123"},
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert result["total"] == 0
    assert len(result["items"]) == 0
