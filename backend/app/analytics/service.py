from typing import Optional

from app.analytics import crud, model, schema
from app.users.model import User
from sqlmodel.ext.asyncio.session import AsyncSession


async def log_event(
    session: AsyncSession,
    event_in: schema.AnalyticsEventCreate,
    current_user: Optional[User] = None,
) -> model.AnalyticsEvent:
    # Create model instance
    event = model.AnalyticsEvent.model_validate(event_in)

    # Attach user_id if user is authenticated
    if current_user:
        event.user_id = current_user.id

    return await crud.create_event(session, event)


async def get_overview(session: AsyncSession) -> schema.AnalyticsStatsOverview:
    stats = await crud.get_stats_overview(session)
    return schema.AnalyticsStatsOverview(**stats)


async def get_trend(session: AsyncSession, days: int) -> list[schema.DailyTrend]:
    trends = await crud.get_daily_trend(session, days)
    return [schema.DailyTrend(**t) for t in trends]


async def get_top_posts(session: AsyncSession, limit: int) -> list[schema.TopPostStat]:
    top_posts = await crud.get_top_posts(session, limit)
    return [schema.TopPostStat(**p) for p in top_posts]
