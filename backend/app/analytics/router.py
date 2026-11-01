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

    # 获取真实客户端 IP（考虑反向代理）
    def get_real_ip(request: Request) -> Optional[str]:
        """从请求中提取真实客户端 IP，优先使用反向代理头"""
        # 优先级：X-Forwarded-For > X-Real-IP > request.client.host
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # X-Forwarded-For 可能包含多个 IP，取第一个（真实客户端）
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # 兜底：直接连接 IP（可能是代理 IP）
        return request.client.host if request.client else None

    if "ip" not in event_in.payload:
        client_ip = get_real_ip(request)
        if client_ip:
            event_in.payload["ip"] = client_ip

    # 解析 User-Agent
    ua = user_agents.parse(ua_string)

    # 提取 IP (优先从 payload 获取)
    ip_addr = event_in.payload.get("ip")
    if not ip_addr:
        ip_addr = get_real_ip(request)

    # 提取时长 (如果前端上传)
    duration = event_in.payload.get("duration", 0)

    # ip2region 地理位置解析（国内 IP 更准确）
    country = "Unknown"
    city = "Unknown"
    province = "Unknown"
    isp = "Unknown"

    if ip_addr:
        try:
            import ip2region.searcher as xdb
            import ip2region.util as util

            # 使用 VectorIndex 缓存模式（推荐）
            db_path = "data/ip2region.xdb"
            version = util.IPv4  # 目前只支持 IPv4

            import os

            if os.path.exists(db_path):
                # 创建查询对象（使用 VectorIndex 缓存以提升性能）
                # 注意：生产环境应该全局缓存 v_index，这里为了简化每次都加载
                v_index = util.load_vector_index_from_file(db_path)
                searcher = xdb.new_with_vector_index(version, db_path, v_index)

                # 查询 IP
                # 返回格式: 国家|区域|省份|城市|ISP
                # 例如: 中国|0|浙江省|杭州市|电信
                result = searcher.search(ip_addr)
                searcher.close()

                if result:
                    parts = result.split("|")
                    # 实际返回格式: 国家|省份|城市|ISP|国家代码
                    # 例如: 中国|浙江省|绍兴市|移动|CN
                    if len(parts) >= 5:
                        country = (
                            parts[0] if parts[0] and parts[0] != "0" else "Unknown"
                        )
                        province = (
                            parts[1] if parts[1] and parts[1] != "0" else "Unknown"
                        )
                        city = parts[2] if parts[2] and parts[2] != "0" else "Unknown"
                        isp = parts[3] if parts[3] and parts[3] != "0" else "Unknown"
                    elif len(parts) >= 4:
                        # 兼容旧格式或不完整数据
                        country = (
                            parts[0] if parts[0] and parts[0] != "0" else "Unknown"
                        )
                        province = (
                            parts[1] if parts[1] and parts[1] != "0" else "Unknown"
                        )
                        city = parts[2] if parts[2] and parts[2] != "0" else "Unknown"
                        isp = parts[3] if parts[3] and parts[3] != "0" else "Unknown"

        except Exception as e:
            # IP 解析失败，记录日志但不影响主流程
            logger.warning(f"ip2region resolution failed for IP {ip_addr}: {str(e)}")
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
        "region": province,  # 使用 region 字段存储省份
        "isp": isp,  # 运营商信息
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
    "/stats/web-vitals",
    response_model=schema.WebVitalsSummary,
    dependencies=[Depends(get_current_superuser)],
    summary="Core Web Vitals 汇总",
    description=api_doc.STATS_WEB_VITALS_DOC,
)
async def get_analytics_web_vitals(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    days: int = Query(7, ge=1, le=90, description="统计天数"),
):
    return await service.get_web_vitals(session, days)


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
