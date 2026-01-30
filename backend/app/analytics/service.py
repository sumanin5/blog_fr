from typing import Optional

from app.analytics import crud, model, schema
from app.users.model import User
from fastapi_pagination import Page, Params
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


async def get_sessions_list(
    session: AsyncSession, params: Params
) -> Page[schema.SessionListItem]:
    def transform_rows(rows):
        return [
            schema.SessionListItem(
                session_id=row.session_id,
                visitor_id=row.visitor_id,
                ip_address=row.ip_address,
                country=row.country,
                region=row.region if hasattr(row, "region") else None,
                city=row.city,
                isp=row.isp if hasattr(row, "isp") else None,
                device_info=f"{row.browser or 'Unknown'} / {row.os or 'Unknown'}",
                start_time=row.start_time,
                last_active=row.last_active,
                duration=row.duration or 0,
                page_count=row.page_count,
                is_bot=row.is_bot or False,
            )
            for row in rows
        ]

    return await crud.get_sessions_list(session, params, transformer=transform_rows)


async def get_dashboard_stats(
    session: AsyncSession, days: int = 30
) -> schema.DashboardStats:
    stats = await crud.get_dashboard_stats(session, days)
    return schema.DashboardStats(**stats)


async def get_session_detail(
    session: AsyncSession, session_id: str
) -> Optional[schema.AnalyticsSessionDetail]:
    row = await crud.get_session_stats(session, session_id)
    if not row:
        return None

    events = await crud.get_session_events(session, session_id)

    return schema.AnalyticsSessionDetail(
        session_id=row.session_id,
        visitor_id=row.visitor_id,
        ip_address=row.ip_address,
        country=row.country,
        region=row.region if hasattr(row, "region") else None,
        city=row.city,
        isp=row.isp if hasattr(row, "isp") else None,
        device_info=f"{row.browser or 'Unknown'} / {row.os or 'Unknown'}",
        start_time=row.start_time,
        last_active=row.last_active,
        duration=row.duration or 0,
        page_count=row.page_count,
        is_bot=row.is_bot or False,
        events=[
            schema.SessionEvent(
                id=e.id,
                event_type=e.event_type,
                page_path=e.page_path,
                created_at=e.created_at,
                duration=e.duration or 0,
            )
            for e in events
        ],
    )
