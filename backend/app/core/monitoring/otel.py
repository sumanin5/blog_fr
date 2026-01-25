import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def setup_opentelemetry(app) -> None:
    """初始化 OpenTelemetry (OTEL) 分布式追踪"""
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

        resource = Resource(attributes={SERVICE_NAME: "blog-api"})
        provider = TracerProvider(resource=resource)
        otlp_exporter = OTLPSpanExporter(
            endpoint=settings.otel_exporter_endpoint, insecure=True
        )
        provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

        trace.set_tracer_provider(provider)
        FastAPIInstrumentor.instrument_app(app)
        SQLAlchemyInstrumentor().instrument()

        logger.info("✅ OpenTelemetry initialized")
    except ImportError:
        logger.warning("⚠️  OpenTelemetry packages not installed")
