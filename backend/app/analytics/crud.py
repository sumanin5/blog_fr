from datetime import date, datetime, timedelta, timezone

from app.analytics.model import AnalyticsEvent
from app.posts.model import Post
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
