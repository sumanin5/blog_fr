import logging
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
from fastapi_pagination import Page, Params
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)

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

    # GeoIP2 地理位置解析
    country = "Unknown"
    city = "Unknown"
    geoip_path = "data/GeoLite2-City.mmdb"

    import os

    if ip_addr and os.path.exists(geoip_path):
        import geoip2.database
        import geoip2.errors

        try:
            with geoip2.database.Reader(geoip_path) as reader:
                try:
                    # 尝试解析 IP
                    response = reader.city(ip_addr)
                    # 优先获取英文名称，fallback 到 Unknown
                    country = response.country.name or "Unknown"
                    city = response.city.name or "Unknown"

                except (ValueError, geoip2.errors.AddressNotFoundError):
                    # IP 格式错误或未找到
                    pass
        except Exception as e:
            # 文件读取或其他异常，通过日志记录
            logger.warning(f"GeoIP resolution failed for IP {ip_addr}: {str(e)}")
            pass

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
        "country": country,
        "city": city,
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


@router.get(
    "/stats/dashboard",
    response_model=schema.DashboardStats,
    dependencies=[Depends(get_current_superuser)],
    summary="TrafficPulse 仪表盘聚合数据",
    description=api_doc.STATS_DASHBOARD_DOC,
)
async def get_analytics_dashboard(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    days: int = Query(30, ge=1, le=365, description="统计天数"),
):
    return await service.get_dashboard_stats(session, days)


@router.get(
    "/stats/sessions",
    response_model=Page[schema.SessionListItem],
    dependencies=[Depends(get_current_superuser)],
    summary="用户会话列表",
    description=api_doc.STATS_SESSIONS_DOC,
)
async def get_analytics_sessions(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    params: Params = Depends(),
):
    return await service.get_sessions_list(session, params)


@router.get(
    "/stats/sessions/{session_id}",
    response_model=Optional[schema.AnalyticsSessionDetail],
    dependencies=[Depends(get_current_superuser)],
    summary="获取单个会话详情",
    description="获取指定会话的完整信息，包括用户画像和访问路径时间轴。",
)
async def get_analytics_session_detail(
    session_id: str,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    from fastapi import HTTPException

    data = await service.get_session_detail(session, session_id)
    if not data:
        raise HTTPException(status_code=404, detail="Session not found")
    return data
