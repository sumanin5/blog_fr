from typing import Annotated, Optional

import user_agents
from app.analytics import api_doc, schema, service
from app.core.db import get_async_session
from app.users.dependencies import (
    get_current_superuser,
    get_optional_current_user,
)
from app.users.model import User
from fastapi import APIRouter, Depends, Query, Request
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter()


@router.post(
    "/events",
    response_model=schema.AnalyticsEventResponse,
    summary="记录分析事件",
    description=api_doc.LOG_EVENT_DOC,
)
async def log_analytics_event(
    event_in: schema.AnalyticsEventCreate,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    request: Request,
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)] = None,
):
    # 🚫 管理员/超级用户访问不计入统计
    if current_user and current_user.is_superadmin:
        import uuid
        from datetime import datetime

        # 返回一个临时的伪造响应，欺骗前端（避免报错），但实际上不写入数据库
        return schema.AnalyticsEventResponse(
            id=uuid.uuid4(),
            event_type=event_in.event_type,
            page_path=event_in.page_path,
            is_bot=False,
            created_at=datetime.now(),
            user_id=current_user.id,
        )

    # 丰富数据 Payload (IP, User-Agent)
    if event_in.payload is None:
        event_in.payload = {}

    ua_string = request.headers.get("user-agent", "")
    if "user_agent" not in event_in.payload:
        event_in.payload["user_agent"] = ua_string

    if "ip" not in event_in.payload:
        client_host = request.client.host if request.client else None
        if client_host:
            event_in.payload["ip"] = client_host

    # 解析 User-Agent
    ua = user_agents.parse(ua_string)

    # 提取 IP (优先从 payload 获取，否则用连接 IP)
    ip_addr = event_in.payload.get("ip")
    if not ip_addr and request.client:
        ip_addr = request.client.host

    # 提取时长 (如果前端上传)
    duration = event_in.payload.get("duration", 0)

    # 将解析结果注入到 service 调用中
    # 注意：我们直接修改 event_in 对象，service 中的 model_validate 会自动处理这些字段
    extra_data = {
        "is_bot": ua.is_bot,
        "browser_family": ua.browser.family,
        "os_family": ua.os.family,
        "device_family": "Mobile"
        if ua.is_mobile
        else "Tablet"
        if ua.is_tablet
        else "PC"
        if ua.is_pc
        else "Other",
        # 新增字段注入
        "ip_address": ip_addr,
        "duration": duration,
        # TODO: 集成 GeoIP2 获取真实地理位置
        "country": "Unknown",
        "city": "Unknown",
    }

    # 使用 model_copy 创建一个带有新字段的 Pydantic 模型
    event_data = event_in.model_dump()
    event_data.update(extra_data)
    enriched_event_in = schema.AnalyticsEventCreate(**event_data)

    return await service.log_event(session, enriched_event_in, current_user)


# ============================================================
# 管理员统计接口
# ============================================================


@router.get(
    "/stats/overview",
    response_model=schema.AnalyticsStatsOverview,
    dependencies=[Depends(get_current_superuser)],
    summary="全站流量概览",
    description=api_doc.STATS_OVERVIEW_DOC,
)
async def get_analytics_overview(
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    return await service.get_overview(session)


@router.get(
    "/stats/trend",
    response_model=list[schema.DailyTrend],
    dependencies=[Depends(get_current_superuser)],
    summary="流量趋势分析",
    description=api_doc.STATS_TREND_DOC,
)
async def get_analytics_trend(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    days: int = Query(7, ge=1, le=90, description="统计天数 (7, 15, 30 或 90)"),
):
    return await service.get_trend(session, days)


@router.get(
    "/stats/top-posts",
    response_model=list[schema.TopPostStat],
    dependencies=[Depends(get_current_superuser)],
    summary="热门内容排行",
    description=api_doc.STATS_TOP_POSTS_DOC,
)
async def get_analytics_top_posts(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    limit: int = Query(10, ge=1, le=50),
):
    return await service.get_top_posts(session, limit)
