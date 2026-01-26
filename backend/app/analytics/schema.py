from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AnalyticsEventBase(BaseModel):
    event_type: str
    page_path: str
    session_id: Optional[str] = None
    visitor_id: Optional[str] = None
    payload: Optional[dict[str, Any]] = None


class AnalyticsEventCreate(AnalyticsEventBase):
    pass


class AnalyticsEventResponse(AnalyticsEventBase):
    id: UUID
    user_id: Optional[UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
