import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


def _sentry_before_send(event, hint):
    """Sentry 事件发送前的钩子，过滤敏感信息"""
    if "request" in event:
        if "data" in event["request"]:
            data = event["request"]["data"]
            if isinstance(data, dict):
                for key in ["password", "hashed_password", "token", "secret"]:
                    if key in data:
                        data[key] = "[FILTERED]"

    if "exception" in event:
        exc_type = event["exception"]["values"][0]["type"]
        if exc_type in ["NotFoundError", "PostNotFoundError"]:
            return None
    return event


def setup_sentry(app) -> None:
    """初始化 Sentry APM"""
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
            environment=settings.sentry_environment,
            traces_sample_rate=settings.sentry_traces_sample_rate,
            integrations=[
                StarletteIntegration(transaction_style="endpoint"),
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
            ],
            send_default_pii=False,
            before_send=_sentry_before_send,
        )
        logger.info(f"✅ Sentry initialized: environment={settings.sentry_environment}")
    except ImportError:
        logger.warning("⚠️  sentry-sdk not installed. Monitoring will be disabled.")


def capture_exception(error: Exception, context: Optional[dict] = None) -> None:
    """手动捕获异常并发送到 Sentry"""
    try:
        import sentry_sdk

        with sentry_sdk.push_scope() as scope:
            if context:
                for key, value in context.items():
                    scope.set_context(key, value)
            sentry_sdk.capture_exception(error)
    except ImportError:
        logger.error(f"Captured: {error}", extra=context, exc_info=True)
