"""
APM 监控集成模块

支持多种 APM 方案：
1. Sentry - 错误追踪和性能监控（推荐）
2. OpenTelemetry - 开源可观测性标准
3. 自定义监控 - 简单的性能日志

使用方式：
    from app.core.monitoring import setup_monitoring
    setup_monitoring(app)
"""

import logging
import time
from typing import Optional

from app.core.config import settings
from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


# ============================================================
# 1. Sentry 集成（生产环境推荐）
# ============================================================


def setup_sentry(app: FastAPI) -> None:
    """
    集成 Sentry APM

    功能：
    - 自动捕获未处理的异常
    - 追踪 API 性能（慢请求告警）
    - 记录用户上下文（用户 ID、请求参数）
    - 数据库查询性能分析

    安装：
        uv add sentry-sdk[fastapi]

    配置环境变量：
        SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
        SENTRY_ENVIRONMENT=production  # 或 development
        SENTRY_TRACES_SAMPLE_RATE=0.1  # 采样率 10%
    """
    if not settings.sentry_dsn:
        logger.info("Sentry DSN not configured, skipping Sentry integration")
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            # 环境标识（区分开发/测试/生产）
            environment=settings.sentry_environment,
            # 性能追踪采样率（0.0 - 1.0）
            # 生产环境建议 0.1（10%），避免性能开销
            traces_sample_rate=settings.sentry_traces_sample_rate,
            # 集成 FastAPI、SQLAlchemy
            integrations=[
                StarletteIntegration(transaction_style="endpoint"),
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
            ],
            # 发送默认的 PII（个人身份信息）
            # 生产环境建议设为 False，避免泄露敏感信息
            send_default_pii=False,
            # 附加上下文信息
            before_send=_sentry_before_send,
        )

        logger.info(
            f"✅ Sentry initialized: environment={settings.sentry_environment}, "
            f"sample_rate={settings.sentry_traces_sample_rate}"
        )

    except ImportError:
        logger.warning("⚠️  sentry-sdk not installed. Run: uv add 'sentry-sdk[fastapi]'")


def _sentry_before_send(event, hint):
    """
    Sentry 事件发送前的钩子

    用途：
    - 过滤敏感信息（密码、token）
    - 添加自定义标签
    - 忽略特定错误
    """
    # 过滤敏感字段
    if "request" in event:
        if "data" in event["request"]:
            data = event["request"]["data"]
            if isinstance(data, dict):
                # 移除密码字段
                for key in ["password", "hashed_password", "token", "secret"]:
                    if key in data:
                        data[key] = "[FILTERED]"

    # 忽略特定错误（如 404）
    if "exception" in event:
        exc_type = event["exception"]["values"][0]["type"]
        if exc_type in ["NotFoundError", "PostNotFoundError"]:
            return None  # 不发送到 Sentry

    return event


# ============================================================
# 2. 自定义性能监控中间件（轻量级方案）
# ============================================================


class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """
    自定义性能监控中间件

    功能：
    - 记录每个请求的响应时间
    - 慢请求告警（超过阈值）
    - 统计 API 调用次数

    适用场景：
    - 不想引入第三方 APM 服务
    - 需要简单的性能日志
    - 开发环境调试
    """

    def __init__(self, app, slow_request_threshold: float = 1.0):
        """
        Args:
            slow_request_threshold: 慢请求阈值（秒），超过此值会记录警告
        """
        super().__init__(app)
        self.slow_request_threshold = slow_request_threshold

    async def dispatch(self, request: Request, call_next):
        # 记录请求开始时间
        start_time = time.time()

        # 处理请求
        response = await call_next(request)

        # 计算响应时间
        process_time = time.time() - start_time

        # 添加响应头（方便前端监控）
        response.headers["X-Process-Time"] = f"{process_time:.3f}"

        # 记录日志
        log_data = {
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "process_time": f"{process_time:.3f}s",
            "client_ip": request.client.host if request.client else "unknown",
        }

        # 慢请求告警
        if process_time > self.slow_request_threshold:
            logger.warning(f"🐌 Slow request detected: {log_data}")
        else:
            logger.info(f"✅ Request completed: {log_data}")

        return response


# ============================================================
# 3. OpenTelemetry 集成（开源标准）
# ============================================================


def setup_opentelemetry(app: FastAPI) -> None:
    """
    集成 OpenTelemetry

    优点：
    - 开源标准，不绑定特定厂商
    - 支持导出到多种后端（Jaeger、Zipkin、Prometheus）
    - 分布式追踪能力强

    安装：
        uv add opentelemetry-api opentelemetry-sdk
        uv add opentelemetry-instrumentation-fastapi
        uv add opentelemetry-instrumentation-sqlalchemy

    配置环境变量：
        OTEL_SERVICE_NAME=blog-api
        OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
    """
    if not settings.enable_opentelemetry:
        return

    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
            OTLPSpanExporter,
        )
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.sdk.resources import SERVICE_NAME, Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        # 配置资源信息
        resource = Resource(attributes={SERVICE_NAME: "blog-api"})

        # 创建 TracerProvider
        provider = TracerProvider(resource=resource)

        # 配置导出器（发送到 OTLP Collector）
        otlp_exporter = OTLPSpanExporter(
            endpoint=settings.otel_exporter_endpoint, insecure=True
        )
        processor = BatchSpanProcessor(otlp_exporter)
        provider.add_span_processor(processor)

        # 设置全局 TracerProvider
        trace.set_tracer_provider(provider)

        # 自动注入 FastAPI 和 SQLAlchemy
        FastAPIInstrumentor.instrument_app(app)
        SQLAlchemyInstrumentor().instrument()

        logger.info("✅ OpenTelemetry initialized")

    except ImportError:
        logger.warning("⚠️  OpenTelemetry packages not installed")


# ============================================================
# 统一入口
# ============================================================


def setup_monitoring(app: FastAPI) -> None:
    """
    设置监控系统

    根据配置自动选择：
    1. Sentry（如果配置了 SENTRY_DSN）
    2. OpenTelemetry（如果启用）
    3. 自定义性能监控（始终启用）
    """
    logger.info("🔍 Setting up monitoring...")

    # 1. Sentry（生产环境推荐）
    setup_sentry(app)

    # 2. OpenTelemetry（可选）
    setup_opentelemetry(app)

    # 3. 自定义性能监控（轻量级，始终启用）
    app.add_middleware(
        PerformanceMonitoringMiddleware,
        slow_request_threshold=settings.slow_request_threshold,
    )

    logger.info("✅ Monitoring setup completed")


# ============================================================
# 手动追踪工具（用于业务代码）
# ============================================================


def capture_exception(error: Exception, context: Optional[dict] = None) -> None:
    """
    手动捕获异常并发送到 APM

    使用场景：
    - try-except 中捕获的异常
    - 需要附加额外上下文信息

    示例：
        try:
            result = await some_operation()
        except Exception as e:
            capture_exception(e, {"user_id": user.id, "operation": "create_post"})
            raise
    """
    try:
        import sentry_sdk

        with sentry_sdk.push_scope() as scope:
            if context:
                for key, value in context.items():
                    scope.set_context(key, value)
            sentry_sdk.capture_exception(error)
    except ImportError:
        # Sentry 未安装，只记录日志
        logger.error(f"Exception captured: {error}", extra=context, exc_info=True)


def track_performance(operation_name: str):
    """
    性能追踪装饰器

    使用示例：
        @track_performance("create_post")
        async def create_post(session, post_data):
            # 业务逻辑
            pass
    """

    def decorator(func):
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                logger.info(
                    f"⏱️  Performance: {operation_name} took {duration:.3f}s",
                    extra={"operation": operation_name, "duration": duration},
                )

        return wrapper

    return decorator
