from datetime import datetime, timedelta

import pytest
from app.analytics.model import AnalyticsEvent
from sqlmodel.ext.asyncio.session import AsyncSession


@pytest.fixture
async def sample_analytics_data(session: AsyncSession):
    """
    插入测试用的分析数据：
    - 2个真实用户会话
    - 1个爬虫会话
    - 包含时长统计
    """
    now = datetime.now()
    yesterday = now - timedelta(days=1)

    events = [
        # Session A (Real User, Mobile, 60s duration)
        AnalyticsEvent(
            event_type="page_view",
            page_path="/",
            session_id="sess_a",
            visitor_id="visitor_a",
            ip_address="1.1.1.1",
            device_family="Mobile",
            is_bot=False,
            created_at=yesterday,
            duration=0,
        ),
        AnalyticsEvent(
            event_type="heartbeat",
            page_path="/",
            session_id="sess_a",
            visitor_id="visitor_a",
            ip_address="1.1.1.1",
            device_family="Mobile",
            is_bot=False,
            created_at=yesterday + timedelta(seconds=30),
            duration=30,
        ),
        AnalyticsEvent(
            event_type="heartbeat",
            page_path="/",
            session_id="sess_a",
            visitor_id="visitor_a",
            ip_address="1.1.1.1",
            device_family="Mobile",
            is_bot=False,
            created_at=yesterday + timedelta(seconds=60),
            duration=30,
        ),
        # Session B (Real User, PC, 10s duration)
        AnalyticsEvent(
            event_type="page_view",
            page_path="/about",
            session_id="sess_b",
            visitor_id="visitor_b",
            ip_address="2.2.2.2",
            device_family="PC",
            is_bot=False,
            created_at=now,
            duration=0,
        ),
        AnalyticsEvent(
            event_type="heartbeat",
            page_path="/about",
            session_id="sess_b",
            visitor_id="visitor_b",
            ip_address="2.2.2.2",
            device_family="PC",
            is_bot=False,
            created_at=now + timedelta(seconds=10),
            duration=10,
        ),
        # Session C (Bot)
        AnalyticsEvent(
            event_type="page_view",
            page_path="/robots.txt",
            session_id="sess_bot",
            visitor_id="bot_1",
            ip_address="66.249.66.1",
            device_family="Other",
            is_bot=True,
            created_at=now,
            duration=0,
        ),
    ]

    for event in events:
        session.add(event)
    await session.commit()
    return events
