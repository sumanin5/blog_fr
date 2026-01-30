from typing import Optional
from uuid import UUID

from app.core.base import Base
from sqlalchemy import JSON, Column, text
from sqlmodel import Field


class AnalyticsEvent(Base, table=True):
    __tablename__ = "analytics_event"

    event_type: str = Field(
        index=True, description="Type of the event, e.g., page_view, click"
    )
    page_path: str = Field(
        index=True, description="The path of the page where the event occurred"
    )

    # 核心统计维度 (打平处理，方便 SQL 聚合)
    referrer: Optional[str] = Field(
        default=None, index=True, description="The referring URL"
    )
    is_bot: bool = Field(
        default=False,
        index=True,
        sa_column_kwargs={"server_default": text("false")},
        description="Whether the event was triggered by a bot",
    )

    # 文章关联 (Optional)
    post_id: Optional[UUID] = Field(
        default=None, index=True, description="Linked Post ID if applicable"
    )

    # 地理与会话
    session_id: Optional[str] = Field(
        default=None, index=True, description="Session identifier"
    )
    visitor_id: Optional[str] = Field(
        default=None, index=True, description="Visitor identifier"
    )
    user_id: Optional[UUID] = Field(
        default=None, nullable=True, index=True, description="User ID if authenticated"
    )

    # 设备画像 (Parsed from User-Agent)
    browser_family: Optional[str] = Field(default=None, index=True)
    os_family: Optional[str] = Field(default=None, index=True)
    device_family: Optional[str] = Field(default=None, index=True)  # Mobile, Tablet, PC

    # Payload for extra data (browser info, custom props)
    payload: dict = Field(
        default={}, sa_column=Column(JSON), description="Additional raw data"
    )

    # --- 新增：为了支持详细的地图和用户画像分析 ---
    ip_address: Optional[str] = Field(default=None, index=True, description="User IP")

    # 地理位置信息 (哪怕是大概的)
    country: Optional[str] = Field(default=None, index=True)
    city: Optional[str] = Field(default=None, index=True)
    region: Optional[str] = Field(default=None, index=True)  # Province/State
    isp: Optional[str] = Field(
        default=None, index=True
    )  # ISP/运营商 (移动/电信/联通等)
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)

    # 行为分析
    duration: Optional[int] = Field(
        default=0, description="Time spent in seconds"
    )  # 需要前端配合心跳上报
