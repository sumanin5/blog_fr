import logging

from app.core.config import settings
from fastapi import FastAPI

from .middleware import PerformanceMonitoringMiddleware
from .otel import setup_opentelemetry
from .sentry import capture_exception, setup_sentry
from .utils import track_performance

# 导出工具函数，保持外部 API 不变
__all__ = ["setup_monitoring", "capture_exception", "track_performance"]

logger = logging.getLogger(__name__)


def setup_monitoring(app: FastAPI) -> None:
    """
    统一设置监控系统（总指挥部）
    """
    logger.info("🔍 Setting up monitoring systems...")

    # 1. 初始化 Sentry
    setup_sentry(app)

    # 2. 初始化 OpenTelemetry
    setup_opentelemetry(app)

    # 3. 挂载本地性能监控中间件
    app.add_middleware(
        PerformanceMonitoringMiddleware,
        slow_request_threshold=settings.slow_request_threshold,
    )

    logger.info("✅ Monitoring setup system initialized")
