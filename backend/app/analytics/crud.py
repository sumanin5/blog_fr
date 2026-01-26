from app.analytics.model import AnalyticsEvent
from sqlmodel.ext.asyncio.session import AsyncSession


async def create_event(session: AsyncSession, event: AnalyticsEvent) -> AnalyticsEvent:
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event
