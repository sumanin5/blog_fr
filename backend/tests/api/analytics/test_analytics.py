import pytest
from fastapi import status
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession


@pytest.mark.integration
@pytest.mark.analytics
async def test_log_event_anonymous(async_client: AsyncClient, session: AsyncSession):
    """测试匿名用户记录事件。"""
    data = {
        "event_type": "page_view",
        "page_path": "/",
        "visitor_id": "test_visitor_1",
        "payload": {"source": "direct"},
    }
    response = await async_client.post("/api/v1/analytics/events", json=data)

    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert result["page_path"] == "/"
    assert result["is_bot"] is False  # 默认不是机器人
    assert "id" in result


@pytest.mark.integration
@pytest.mark.analytics
async def test_log_event_bot(async_client: AsyncClient, session: AsyncSession):
    """测试爬虫识别。"""
    data = {"event_type": "page_view", "page_path": "/"}
    # 模拟 Googlebot 的 User-Agent
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
    }
    response = await async_client.post(
        "/api/v1/analytics/events", json=data, headers=headers
    )

    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert result["is_bot"] is True


@pytest.mark.integration
@pytest.mark.analytics
@pytest.mark.permissions
async def test_get_stats_forbidden_for_normal_user(
    async_client: AsyncClient, normal_user_token_headers: dict
):
    """测试普通用户无法访问统计接口。"""
    response = await async_client.get(
        "/api/v1/analytics/stats/overview", headers=normal_user_token_headers
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.integration
@pytest.mark.analytics
async def test_get_stats_overview_success(
    async_client: AsyncClient, superadmin_user_token_headers: dict, sample_events: list
):
    """测试超级管理员获取概览数据。"""
    response = await async_client.get(
        "/api/v1/analytics/stats/overview", headers=superadmin_user_token_headers
    )
    assert response.status_code == status.HTTP_200_OK
    result = response.json()

    # 根据 sample_events: 2个真实用户，1个爬虫
    assert result["total_pv"] == 2
    assert result["total_uv"] == 2
    assert result["bot_percentage"] > 0


@pytest.mark.integration
@pytest.mark.analytics
async def test_get_stats_trend(
    async_client: AsyncClient, superadmin_user_token_headers: dict, sample_events: list
):
    """测试获取趋势数据。"""
    response = await async_client.get(
        "/api/v1/analytics/stats/trend?days=7", headers=superadmin_user_token_headers
    )
    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert len(result) > 0
    assert "pv" in result[0]


@pytest.mark.integration
@pytest.mark.analytics
async def test_get_top_posts(
    async_client: AsyncClient, superadmin_user_token_headers: dict, sample_events: list
):
    """测试获取热门文章。"""
    response = await async_client.get(
        "/api/v1/analytics/stats/top-posts", headers=superadmin_user_token_headers
    )
    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert len(result) >= 1
    assert result[0]["views"] == 1  # sample_events 中只有1个带 post_id 的真实事件
