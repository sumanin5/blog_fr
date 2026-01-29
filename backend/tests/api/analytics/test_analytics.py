import pytest
from app.analytics.model import AnalyticsEvent
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession


@pytest.mark.asyncio
async def test_dashboard_stats_core_metrics(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    sample_analytics_data: list[AnalyticsEvent],
    api_urls,
):
    """
    测试仪表盘核心指标：访客数、会话数、爬虫占比
    """
    response = await async_client.get(
        api_urls.analytics_url("/stats/dashboard"),
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200
    data = response.json()

    # 验证核心指标
    assert data["realUserCount"] == 2
    assert data["totalVisits"] == 2  # Total sessions (sess_a, sess_b)
    assert data["uniqueIPs"] == 2
    assert data["crawlerCount"] == 1
    assert data["botTrafficPercent"] == 16.7


@pytest.mark.asyncio
async def test_dashboard_stats_avg_duration(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    sample_analytics_data: list[AnalyticsEvent],
    api_urls,
):
    """
    测试平均会话时长计算
    """
    response = await async_client.get(
        api_urls.analytics_url("/stats/dashboard"),
        headers=superadmin_user_token_headers,
    )
    data = response.json()

    # Avg Session Duration:
    # Session A: 30+30 = 60s
    # Session B: 10s
    # Total: 70s / 2 sessions = 35.0s
    assert data["avgSessionDuration"] == 35.0


@pytest.mark.asyncio
async def test_dashboard_stats_device_distribution(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    sample_analytics_data: list[AnalyticsEvent],
    api_urls,
):
    """
    测试设备分布数据的准确性
    """
    response = await async_client.get(
        api_urls.analytics_url("/stats/dashboard"),
        headers=superadmin_user_token_headers,
    )
    data = response.json()

    device_stats = {d["name"]: d["value"] for d in data["deviceStats"]}

    # Session A (Mobile): 3 events
    assert device_stats.get("Mobile") == 3
    # Session B (PC): 2 events
    assert device_stats.get("PC") == 2
    # Bot (Other): Excluded from device stats (usually)
    # Check crud implementation: .where(AnalyticsEvent.is_bot.is_(False)) -> Correct.
    assert "Other" not in device_stats or device_stats["Other"] == 0


@pytest.mark.asyncio
async def test_dashboard_empty_data(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    api_urls,
):
    """
    测试无数据情况下的默认返回值
    """
    # 不使用 fixture，数据库为空
    response = await async_client.get(
        api_urls.analytics_url("/stats/dashboard"),
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200
    data = response.json()

    assert data["totalVisits"] == 0
    assert data["realUserCount"] == 0
    assert data["avgSessionDuration"] == 0.0
    assert data["botTrafficPercent"] == 0.0
    assert data["deviceStats"] == []


@pytest.mark.asyncio
async def test_get_sessions_list(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    sample_analytics_data: list[AnalyticsEvent],
    api_urls,
):
    """
    测试获取会话列表
    """
    response = await async_client.get(
        api_urls.analytics_url("/stats/sessions"),
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200
    data = response.json()

    assert "items" in data
    assert "total" in data

    # Should include sess_a, sess_b, sess_bot
    assert data["total"] == 3

    items = data["items"]

    # Check Session A (Real User, Mobile, 60s)
    sess_a = next((s for s in items if s["session_id"] == "sess_a"), None)
    assert sess_a is not None
    assert sess_a["visitor_id"] == "visitor_a"
    assert sess_a["page_count"] == 3
    assert sess_a["duration"] == 60
    assert sess_a["is_bot"] is False

    # Check Session Bot
    sess_bot = next((s for s in items if s["session_id"] == "sess_bot"), None)
    assert sess_bot is not None
    assert sess_bot["is_bot"] is True


@pytest.mark.asyncio
async def test_log_event(async_client: AsyncClient, api_urls):
    """测试事件上报"""
    payload = {
        "event_type": "page_view",
        "page_path": "/test-page",
        "visitor_id": "test_visitor",
        "session_id": "test_session",
        "payload": {"referrer": "http://google.com"},
    }
    response = await async_client.post(api_urls.analytics_url("/events"), json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] is not None
    assert data["is_bot"] is False


@pytest.mark.asyncio
async def test_stats_overview(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    sample_analytics_data: list[AnalyticsEvent],
    api_urls,
):
    """测试总览数据"""
    response = await async_client.get(
        api_urls.analytics_url("/stats/overview"),
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    # sess_a (3) + sess_b (2) = 5 real PVs
    assert data["total_pv"] == 5
    # visitor_a, visitor_b = 2 real UVs
    assert data["total_uv"] == 2


@pytest.mark.asyncio
async def test_stats_trend(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    sample_analytics_data: list[AnalyticsEvent],
    api_urls,
):
    """测试趋势数据"""
    response = await async_client.get(
        api_urls.analytics_url("/stats/trend?days=7"),
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

    # Fixture creates data for Yesterday (3 PV) and Today (2 PV)
    # Filter only days with data
    data_points = [item for item in data if item["pv"] > 0]
    # We expect at least data points. Could be 1 or 2 depending on timezone
    assert len(data_points) >= 1

    total_pv = sum(item["pv"] for item in data_points)
    assert total_pv == 5

    total_uv = sum(item["uv"] for item in data_points)
    # Distinct UV sum might be 2 (visitor_a, visitor_b) if dates split
    # Or 2 if merged.
    # Note: Logic of get_daily_trend is sum of UV per day.
    # If same visitor appears on 2 days, they count as 1 UV per day.
    # But here visitor_a (yesterday) and visitor_b (today) are distinct.
    assert total_uv == 2


@pytest.mark.asyncio
async def test_stats_top_posts(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    session: AsyncSession,
    superadmin_user,
    api_urls,
):
    """测试热门文章"""
    # Create a post manually since fixture doesn't have post_ids
    import uuid

    from app.posts.model import Post

    post_id = uuid.uuid4()
    # Ensure author_id is set to avoid IntegrityError
    post = Post(
        id=post_id,
        title="Test Top Post",
        content="Content",
        slug="test-top",
        is_published=True,
        author_id=superadmin_user.id,
    )
    session.add(post)

    # Add events for this post
    from app.analytics.model import AnalyticsEvent

    event = AnalyticsEvent(
        event_type="page_view",
        page_path=f"/posts/{post_id}",
        session_id="sess_top",
        visitor_id="vis_top",
        post_id=post_id,
        is_bot=False,
    )
    session.add(event)
    await session.commit()

    response = await async_client.get(
        api_urls.analytics_url("/stats/top-posts"),
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

    post_entry = next((item for item in data if item["post_id"] == str(post_id)), None)
    assert post_entry is not None
    assert post_entry["views"] == 1
    assert post_entry["title"] == "Test Top Post"
