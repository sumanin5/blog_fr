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
