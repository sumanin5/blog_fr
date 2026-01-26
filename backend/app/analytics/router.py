from typing import Annotated, Optional

from app.analytics import schema, service
from app.core.db import get_async_session
from app.users.dependencies import get_optional_current_user
from app.users.model import User
from fastapi import APIRouter, Depends, Request
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/events", response_model=schema.AnalyticsEventResponse)
async def log_analytics_event(
    event_in: schema.AnalyticsEventCreate,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    request: Request,
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)] = None,
):
    """
    Log a new analytics event.
    Automatically captures User-Agent and IP if not provided in payload.
    Links to user account if authenticated.
    """
    # Auto-enrich payload with IP and User Agent if not present
    if event_in.payload is None:
        event_in.payload = {}

    if "user_agent" not in event_in.payload:
        user_agent = request.headers.get("user-agent")
        if user_agent:
            event_in.payload["user_agent"] = user_agent

    if "ip" not in event_in.payload:
        client_host = request.client.host if request.client else None
        if client_host:
            event_in.payload["ip"] = client_host

    return await service.log_event(session, event_in, current_user)
