from typing import Optional
from uuid import UUID

from app.core.base import Base
from sqlalchemy import JSON, Column
from sqlmodel import Field


class AnalyticsEvent(Base, table=True):
    __tablename__ = "analytics_event"

    event_type: str = Field(
        index=True, description="Type of the event, e.g., page_view, click"
    )
    page_path: str = Field(
        index=True, description="The path of the page where the event occurred"
    )
    session_id: Optional[str] = Field(
        default=None, index=True, description="Session identifier"
    )
    visitor_id: Optional[str] = Field(
        default=None, index=True, description="Visitor identifier"
    )
    user_id: Optional[UUID] = Field(
        default=None, nullable=True, description="User ID if authenticated"
    )

    # Payload for extra data (browser info, custom props)
    payload: dict = Field(
        default={}, sa_column=Column(JSON), description="Additional event data"
    )
