from datetime import date, datetime, timedelta, timezone
from typing import Any, Callable, Optional, Sequence

from app.analytics.model import AnalyticsEvent
from app.posts.model import Post
from fastapi_pagination import Page, Params
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlalchemy import Date, cast, desc, func, select
from sqlmodel.ext.asyncio.session import AsyncSession


async def create_event(session: AsyncSession, event: AnalyticsEvent) -> AnalyticsEvent:
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event


async def get_stats_overview(session: AsyncSession):
    """获取概览统计数据。"""
    now = datetime.now(timezone(timedelta(hours=8)))
    today_start = datetime.combine(now.date(), datetime.min.time())

    # 1. 基础 PV/UV (排除爬虫)
    base_query = select(
        func.count(AnalyticsEvent.id).label("pv"),
        func.count(func.distinct(AnalyticsEvent.visitor_id)).label("uv"),
    ).where(AnalyticsEvent.is_bot.is_(False))

    # 全量
    total_res = await session.execute(base_query)
    total_stats = total_res.one()

    # 今日
    today_res = await session.execute(
        base_query.where(AnalyticsEvent.created_at >= today_start)
    )
    today_stats = today_res.one()

    # 2. 爬虫占比计算
    total_count_res = await session.execute(select(func.count(AnalyticsEvent.id)))
    total_count = total_count_res.scalar_one() or 1

    bot_count_res = await session.execute(
        select(func.count(AnalyticsEvent.id)).where(AnalyticsEvent.is_bot.is_(True))
    )
    bot_count = bot_count_res.scalar_one() or 0

    return {
        "total_pv": total_stats.pv,
        "total_uv": total_stats.uv,
        "today_pv": today_stats.pv,
        "today_uv": today_stats.uv,
        "bot_percentage": round((bot_count / total_count) * 100, 2),
    }


async def get_daily_trend(session: AsyncSession, days: int = 7):
    """获取过去 N 天的日流量趋势图。"""
    start_date = date.today() - timedelta(days=days - 1)

    query = (
        select(
            cast(AnalyticsEvent.created_at, Date).label("date"),
            func.count(AnalyticsEvent.id).label("pv"),
            func.count(func.distinct(AnalyticsEvent.visitor_id)).label("uv"),
        )
        .where(AnalyticsEvent.is_bot.is_(False))
        .where(AnalyticsEvent.created_at >= start_date)
        .group_by(cast(AnalyticsEvent.created_at, Date))
        .order_by("date")
    )

    result = await session.execute(query)
    # 格式化日期为字符串方便前端读取
    return [
        {"date": row.date.isoformat(), "pv": row.pv, "uv": row.uv}
        for row in result.all()
    ]


async def get_top_posts(session: AsyncSession, limit: int = 10):
    """获取阅读量最高的文章排行。"""
    query = (
        select(
            AnalyticsEvent.post_id,
            Post.title,
            func.count(AnalyticsEvent.id).label("views"),
        )
        .join(Post, Post.id == AnalyticsEvent.post_id)
        .where(AnalyticsEvent.is_bot.is_(False))
        .where(AnalyticsEvent.post_id.is_not(None))
        .group_by(AnalyticsEvent.post_id, Post.title)
        .order_by(desc("views"))
        .limit(limit)
    )

    result = await session.execute(query)
    return [
        {"post_id": row.post_id, "title": row.title, "views": row.views}
        for row in result.all()
    ]


async def get_dashboard_stats(session: AsyncSession, days: int = 30):
    """
    TrafficPulse 聚合仪表盘统计
    统计范围: 过去 N 天 (默认为 30 天)
    """
    start_date = datetime.now() - timedelta(days=days)

    # --- 1. 核心指标聚合 ---
    # 筛选条件: 时间范围内
    base_filter = AnalyticsEvent.created_at >= start_date

    # 构造查询
    stats_query = select(
        # 爬虫统计
        func.count(AnalyticsEvent.id)
        .filter(AnalyticsEvent.is_bot.is_(True))
        .label("bot_hits"),
        func.count(AnalyticsEvent.id).label("total_hits"),
        # 真实用户统计 (is_bot = False)
        func.count(func.distinct(AnalyticsEvent.session_id))
        .filter(AnalyticsEvent.is_bot.is_(False))
        .label("total_sessions"),
        func.count(func.distinct(AnalyticsEvent.visitor_id))
        .filter(AnalyticsEvent.is_bot.is_(False))
        .label("unique_users"),
        func.count(func.distinct(AnalyticsEvent.ip_address))
        .filter(AnalyticsEvent.is_bot.is_(False))
        .label("unique_ips"),
        # 时长统计 (总时长 / 总会话数)
        func.sum(AnalyticsEvent.duration)
        .filter(AnalyticsEvent.is_bot.is_(False))
        .label("total_duration"),
    ).where(base_filter)

    stats_res = await session.execute(stats_query)
    stats = stats_res.one()

    total_hits = stats.total_hits or 0
    bot_hits = stats.bot_hits or 0
    total_sessions = stats.total_sessions or 0
    total_duration = stats.total_duration or 0

    bot_percent = (bot_hits / total_hits * 100) if total_hits > 0 else 0.0
    avg_duration = (total_duration / total_sessions) if total_sessions > 0 else 0.0

    # --- 2. 设备分布 (Device Family) ---
    device_query = (
        select(
            AnalyticsEvent.device_family, func.count(AnalyticsEvent.id).label("count")
        )
        .where(base_filter)
        .where(AnalyticsEvent.is_bot.is_(False))
        .group_by(AnalyticsEvent.device_family)
    )
    device_res = await session.execute(device_query)

    # 颜色映射 (简单硬编码或由前端处理，这里返回预定义)
    device_map = {
        "Mobile": "var(--chart-1)",
        "PC": "var(--chart-2)",
        "Tablet": "var(--chart-3)",
        "Other": "var(--chart-4)",
    }

    device_stats = []
    for row in device_res.all():
        family = row.device_family or "Other"
        device_stats.append(
            {
                "name": family,
                "value": row.count,
                "fill": device_map.get(family, "var(--chart-5)"),
            }
        )

    # --- 3. 24小时流量趋势 (Hourly Traffic) ---
    # 仅取最近 24 小时
    yesterday = datetime.now() - timedelta(hours=24)

    # 定义时间截断表达式，确保 GROUP BY 和 ORDER BY 一致
    hour_expr = func.to_char(AnalyticsEvent.created_at, "HH24:00")

    hourly_query = (
        select(
            hour_expr.label("hour"),
            func.count(func.distinct(AnalyticsEvent.visitor_id)).label("visitors"),
            func.count(AnalyticsEvent.id).label("pageViews"),
        )
        .where(AnalyticsEvent.created_at >= yesterday)
        .where(AnalyticsEvent.is_bot.is_(False))
        .group_by(hour_expr)
        .order_by(hour_expr)
    )

    hourly_res = await session.execute(hourly_query)

    hourly_traffic = [
        {"time": row.hour, "visitors": row.visitors, "pageViews": row.pageViews}
        for row in hourly_res.all()
    ]

    return {
        "totalVisits": total_sessions,  # 使用 Session 数作为 Visit 定义
        "realUserCount": stats.unique_users or 0,
        "uniqueIPs": stats.unique_ips or 0,
        "crawlerCount": bot_hits,
        "botTrafficPercent": round(bot_percent, 1),
        "avgSessionDuration": round(avg_duration, 1),
        "deviceStats": device_stats,
        "hourlyTraffic": hourly_traffic,
    }


async def get_sessions_list(
    session: AsyncSession,
    params: Params,
    transformer: Optional[Callable[[Sequence[Any]], Sequence[Any]]] = None,
) -> Page:
    """获取会话列表 (分页 + 聚合)"""
    query = (
        select(
            AnalyticsEvent.session_id,
            func.max(AnalyticsEvent.visitor_id).label("visitor_id"),
            func.max(AnalyticsEvent.ip_address).label("ip_address"),
            func.max(AnalyticsEvent.country).label("country"),
            func.max(AnalyticsEvent.region).label("region"),
            func.max(AnalyticsEvent.city).label("city"),
            func.max(AnalyticsEvent.isp).label("isp"),
            func.max(AnalyticsEvent.browser_family).label("browser"),
            func.max(AnalyticsEvent.os_family).label("os"),
            func.min(AnalyticsEvent.created_at).label("start_time"),
            func.max(AnalyticsEvent.created_at).label("last_active"),
            func.sum(AnalyticsEvent.duration).label("duration"),
            func.count(AnalyticsEvent.id).label("page_count"),
            # PostgreSQL specific aggregation for boolean
            func.bool_or(AnalyticsEvent.is_bot).label("is_bot"),
        )
        .group_by(AnalyticsEvent.session_id)
        .order_by(desc("last_active"))
    )

    return await paginate(session, query, params, transformer=transformer)


async def get_session_stats(session: AsyncSession, session_id: str):
    """获取单个会话的聚合详情"""
    query = (
        select(
            AnalyticsEvent.session_id,
            func.max(AnalyticsEvent.visitor_id).label("visitor_id"),
            func.max(AnalyticsEvent.ip_address).label("ip_address"),
            func.max(AnalyticsEvent.country).label("country"),
            func.max(AnalyticsEvent.region).label("region"),
            func.max(AnalyticsEvent.city).label("city"),
            func.max(AnalyticsEvent.isp).label("isp"),
            func.max(AnalyticsEvent.browser_family).label("browser"),
            func.max(AnalyticsEvent.os_family).label("os"),
            func.min(AnalyticsEvent.created_at).label("start_time"),
            func.max(AnalyticsEvent.created_at).label("last_active"),
            func.sum(AnalyticsEvent.duration).label("duration"),
            func.count(AnalyticsEvent.id).label("page_count"),
            func.bool_or(AnalyticsEvent.is_bot).label("is_bot"),
        )
        .where(AnalyticsEvent.session_id == session_id)
        .group_by(AnalyticsEvent.session_id)
    )
    result = await session.execute(query)
    return result.one_or_none()


async def get_session_events(session: AsyncSession, session_id: str):
    """获取会话的完整事件流"""
    query = (
        select(AnalyticsEvent)
        .where(AnalyticsEvent.session_id == session_id)
        .order_by(AnalyticsEvent.created_at.asc())
    )
    result = await session.execute(query)
    return result.scalars().all()
