from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AnalyticsEventBase(BaseModel):
    event_type: str
    page_path: str
    referrer: Optional[str] = None
    post_id: Optional[UUID] = None
    session_id: Optional[str] = None
    visitor_id: Optional[str] = None
    payload: Optional[dict[str, Any]] = None


class AnalyticsEventCreate(AnalyticsEventBase):
    is_bot: Optional[bool] = None
    browser_family: Optional[str] = None
    os_family: Optional[str] = None
    device_family: Optional[str] = None

    # Geo & Duration
    ip_address: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    duration: Optional[int] = 0


class AnalyticsEventResponse(AnalyticsEventBase):
    id: UUID
    user_id: Optional[UUID] = None
    is_bot: bool
    browser_family: Optional[str] = None
    os_family: Optional[str] = None
    device_family: Optional[str] = None

    # Geo & Duration
    ip_address: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    duration: Optional[int] = 0

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- 统计响应 Schema ---


class AnalyticsStatsOverview(BaseModel):
    total_pv: int
    total_uv: int
    today_pv: int
    today_uv: int
    bot_percentage: float


class DailyTrend(BaseModel):
    date: str
    pv: int
    uv: int


class TopPostStat(BaseModel):
    post_id: UUID
    title: str
    views: int


# --- 聚合分析 Schema (TrafficPulse) ---


class DeviceStats(BaseModel):
    name: str
    value: int
    fill: str  # For frontend charts


class SessionStats(BaseModel):
    totalVisits: int  # PV
    uniqueIPs: int  # UV
    pageViews: int  # PV (Alias, kept for compatibility if needed)
    bounceRate: float
    avgSessionDuration: float


class DashboardStats(BaseModel):
    totalVisits: int
    realUserCount: int
    uniqueIPs: int
    crawlerCount: int
    botTrafficPercent: float
    avgSessionDuration: float

    # Nested charts data
    deviceStats: list[DeviceStats]
    hourlyTraffic: list[
        dict[str, Any]
    ]  # [{"time": "10:00", "visitors": 12, "pageViews": 30}]


class SessionListItem(BaseModel):
    session_id: str
    visitor_id: str
    ip_address: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    device_info: str  # Combined browser/os "Chrome / Windows"
    start_time: datetime
    last_active: datetime
    duration: int
    page_count: int
    is_bot: bool


class SessionEvent(BaseModel):
    id: UUID
    event_type: str
    page_path: str
    created_at: datetime
    duration: Optional[int] = 0


class AnalyticsSessionDetail(SessionListItem):
    events: list[SessionEvent]
