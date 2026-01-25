from pydantic import Field


class MonitoringSettings:
    """APM 与监控追踪配置项"""

    # Sentry 配置
    sentry_dsn: str = Field(default="", description="Sentry DSN（留空则不启用）")
    sentry_environment: str = Field(
        default="development", description="Sentry 环境标识"
    )
    sentry_traces_sample_rate: float = Field(
        default=0.1, description="Sentry 性能追踪采样率（0.0-1.0）"
    )

    # OpenTelemetry 配置
    enable_opentelemetry: bool = Field(
        default=False, description="是否启用 OpenTelemetry"
    )
    otel_exporter_endpoint: str = Field(
        default="http://localhost:4317", description="OTLP Exporter 端点"
    )

    # 性能监控配置
    slow_request_threshold: float = Field(default=1.0, description="慢请求阈值（秒）")
