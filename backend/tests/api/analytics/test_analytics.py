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
    # 爬虫占比按 page_view 计算：3 个 page_view 中 1 个来自爬虫
    assert data["botTrafficPercent"] == 33.3


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

    # 设备分布按 page_view 计：心跳不计入
    assert device_stats.get("Mobile") == 1
    assert device_stats.get("PC") == 1
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
    assert sess_a["page_count"] == 1  # 1 个 page_view + 2 个心跳
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
    # PV 只统计 page_view：sess_a 1 + sess_b 1（心跳不计入）
    assert data["total_pv"] == 2
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
    assert total_pv == 2

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


async def _add_web_vitals(session: AsyncSession, rows: list[tuple[str, dict]]):
    from datetime import datetime

    for i, (path, metrics) in enumerate(rows):
        session.add(
            AnalyticsEvent(
                event_type="web_vitals",
                page_path=path,
                session_id=f"sess_vitals_{i}",
                visitor_id=f"visitor_vitals_{i}",
                device_family="PC",
                is_bot=False,
                created_at=datetime.now(),
                payload={"metrics": metrics},
            )
        )
    await session.commit()


@pytest.mark.asyncio
async def test_web_vitals_excluded_from_traffic_stats(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    sample_analytics_data: list[AnalyticsEvent],
    session: AsyncSession,
    api_urls,
):
    """web_vitals 事件不应影响 PV / UV / 会话 / 设备 / 爬虫占比"""
    await _add_web_vitals(session, [("/", {"lcp": 1200}), ("/about", {"lcp": 900})])

    overview = (
        await async_client.get(
            api_urls.analytics_url("/stats/overview"),
            headers=superadmin_user_token_headers,
        )
    ).json()
    assert overview["total_pv"] == 2
    assert overview["total_uv"] == 2

    dashboard = (
        await async_client.get(
            api_urls.analytics_url("/stats/dashboard"),
            headers=superadmin_user_token_headers,
        )
    ).json()
    assert dashboard["realUserCount"] == 2
    assert dashboard["totalVisits"] == 2
    assert dashboard["botTrafficPercent"] == 33.3
    assert {d["name"]: d["value"] for d in dashboard["deviceStats"]}.get("PC") == 1

    sessions = (
        await async_client.get(
            api_urls.analytics_url("/stats/sessions"),
            headers=superadmin_user_token_headers,
        )
    ).json()
    assert sessions["total"] == 3


@pytest.mark.asyncio
async def test_web_vitals_summary_p75(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    session: AsyncSession,
    api_urls,
):
    """按页面与全站计算 p75，缺失的指标不参与计算"""
    await _add_web_vitals(
        session,
        [
            ("/", {"lcp": 1000, "cls": 0.01, "inp": 100}),
            ("/", {"lcp": 2000, "cls": 0.05}),
            ("/", {"lcp": 3000, "cls": 0.1}),
            ("/", {"lcp": 4000, "cls": 0.2}),
            ("/slow", {"lcp": 6000}),
            ("/no-lcp", {"ttfb": 300}),
        ],
    )

    response = await async_client.get(
        api_urls.analytics_url("/stats/web-vitals?days=7"),
        headers=superadmin_user_token_headers,
    )
    assert response.status_code == 200
    data = response.json()

    metrics = {m["name"]: m for m in data["metrics"]}
    # LCP: [1000, 2000, 3000, 4000, 6000] -> p75 = 4000
    assert metrics["LCP"]["p75"] == pytest.approx(4000)
    assert metrics["LCP"]["samples"] == 5
    # CLS: [0.01, 0.05, 0.1, 0.2] -> p75 (线性插值) = 0.125
    assert metrics["CLS"]["p75"] == pytest.approx(0.125)
    assert metrics["INP"]["samples"] == 1
    assert metrics["FCP"]["p75"] is None
    assert metrics["FCP"]["samples"] == 0

    pages = data["slowest_pages"]
    assert [p["page_path"] for p in pages] == ["/slow", "/"]  # /no-lcp 无 LCP 样本
    home = pages[1]
    assert home["lcp"] == pytest.approx(3250)  # [1000..4000] 的 p75
    assert home["samples"] == 4


@pytest.mark.asyncio
async def test_web_vitals_requires_superadmin(async_client: AsyncClient, api_urls):
    response = await async_client.get(api_urls.analytics_url("/stats/web-vitals"))
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_web_vitals_ingested_via_api(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    api_urls,
):
    """按前端真实请求体上报 web_vitals（键已被 decamelize 为小写），可被汇总接口读出"""
    body = {
        "event_type": "web_vitals",
        "page_path": "/posts/articles/demo",
        "visitor_id": "v_api",
        "session_id": "s_api",
        "payload": {
            "metrics": {"lcp": 800, "fcp": 800, "ttfb": 331, "inp": 128, "cls": 0.0342},
            "navigation_type": "navigate",
        },
    }
    response = await async_client.post(
        api_urls.analytics_url("/events"),
        json=body,
        headers={
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0 Safari/537.36"
        },
    )
    assert response.status_code == 200

    data = (
        await async_client.get(
            api_urls.analytics_url("/stats/web-vitals"),
            headers=superadmin_user_token_headers,
        )
    ).json()
    metrics = {m["name"]: m for m in data["metrics"]}
    assert metrics["LCP"]["p75"] == pytest.approx(800)
    assert metrics["CLS"]["p75"] == pytest.approx(0.0342)
    assert data["slowest_pages"][0]["page_path"] == "/posts/articles/demo"


async def _make_post(session: AsyncSession, author_id, slug: str):
    import uuid

    from app.posts.model import Post, PostStatus

    post = Post(
        id=uuid.uuid4(),
        title=f"Post {slug}",
        content="Content",
        slug=slug,
        status=PostStatus.PUBLISHED,
        author_id=author_id,
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)
    return post


BROWSER_UA = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0 Safari/537.36"
}
BOT_UA = {"User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)"}


@pytest.mark.asyncio
async def test_article_view_event_increments_view_count(
    async_client: AsyncClient,
    session: AsyncSession,
    superadmin_user,
    api_urls,
):
    """浏览量由 article_view 驱动；爬虫不计数；page_view 不计数；updated_at 不变"""
    post = await _make_post(session, superadmin_user.id, "view-by-event")
    original_updated_at = post.updated_at

    async def send(event_type: str, headers: dict):
        res = await async_client.post(
            api_urls.analytics_url("/events"),
            json={
                "event_type": event_type,
                "page_path": "/posts/articles/view-by-event",
                "post_id": str(post.id),
                "visitor_id": "v",
                "session_id": "s",
            },
            headers=headers,
        )
        assert res.status_code == 200

    await send("article_view", BROWSER_UA)
    await send("article_view", BROWSER_UA)
    await send("article_view", BOT_UA)
    await send("page_view", BROWSER_UA)

    await session.refresh(post)
    assert post.view_count == 2
    assert post.updated_at == original_updated_at


@pytest.mark.asyncio
async def test_post_detail_does_not_count_views_or_touch_updated_at(
    async_client: AsyncClient,
    session: AsyncSession,
    superadmin_user,
    api_urls,
):
    """详情接口（被 ISR 缓存的 SSR 请求）不再计数，也不修改 updated_at"""
    post = await _make_post(session, superadmin_user.id, "detail-no-count")
    original_updated_at = post.updated_at

    for _ in range(2):
        res = await async_client.get(
            f"{api_urls.API_PREFIX}/posts/articles/slug/detail-no-count"
        )
        assert res.status_code == 200

    await session.refresh(post)
    assert post.view_count == 0
    assert post.updated_at == original_updated_at


@pytest.mark.asyncio
async def test_counter_updates_preserve_updated_at(
    session: AsyncSession,
    superadmin_user,
):
    """点赞/收藏等计数器不应刷新内容修改时间"""
    from app.posts.cruds import post as post_crud

    post = await _make_post(session, superadmin_user.id, "counter-keeps-ts")
    original_updated_at = post.updated_at

    await post_crud.increment_view_count(session, post.id)
    await post_crud.increment_like_count(session, post.id)
    await post_crud.decrement_like_count(session, post.id)
    await post_crud.increment_bookmark_count(session, post.id)
    await post_crud.decrement_bookmark_count(session, post.id)

    await session.refresh(post)
    assert post.view_count == 1
    assert post.updated_at == original_updated_at


@pytest.mark.asyncio
async def test_post_detail_by_slug_queries_post_once(
    async_client: AsyncClient,
    session: AsyncSession,
    superadmin_user,
    api_urls,
):
    """按 slug 获取详情只查询一次文章主表（此前先按 slug 再按 id，关联预加载执行两遍）"""
    from sqlalchemy import event

    await _make_post(session, superadmin_user.id, "single-query")
    engine = session.bind.sync_engine
    statements: list[str] = []

    def record(conn, cursor, statement, *args):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", record)
    try:
        res = await async_client.get(
            f"{api_urls.API_PREFIX}/posts/articles/slug/single-query"
        )
    finally:
        event.remove(engine, "before_cursor_execute", record)

    assert res.status_code == 200
    main_selects = [
        s for s in statements if s.lstrip().startswith("SELECT posts_post.id")
    ]
    assert len(main_selects) == 1, main_selects
