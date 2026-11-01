import * as Sentry from "@sentry/nextjs";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchSpanProcessor,
  type ReadableSpan,
  type SpanExporter,
} from "@opentelemetry/sdk-trace-base";

import { settings } from "@/config/settings";

function sampleRate(value: string | undefined, fallback: number) {
  const rate = Number.parseFloat(value ?? "");
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : fallback;
}

// Sentry v8+ 底层就是 OpenTelemetry：不另装 @vercel/otel（会争抢全局 TracerProvider），
// 而是在 Sentry 的 provider 上追加 OTLP 导出，同一份 span 同时进入 Sentry 与 Jaeger/Collector。
// OTLPTraceExporter 自动读取 OTEL_EXPORTER_OTLP_ENDPOINT（如 http://jaeger:4318）并拼接 /v1/traces。
const otlpEnabled = Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

// Sentry 的 TracerProvider 把 service.name 固定为 "node"（OTEL_SERVICE_NAME 无效），
// 导出前覆盖为 blog-frontend，便于在 Jaeger 中与 blog-api 区分
function withServiceName(exporter: SpanExporter, serviceName: string): SpanExporter {
  const override = resourceFromAttributes({ "service.name": serviceName });
  return {
    export: (spans, done) =>
      exporter.export(
        spans.map(
          (span) =>
            Object.create(span, {
              resource: { value: span.resource.merge(override) },
            }) as ReadableSpan,
        ),
        done,
      ),
    shutdown: () => exporter.shutdown(),
    forceFlush: () => exporter.forceFlush?.() ?? Promise.resolve(),
  };
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,

  // 性能采样：默认 10%，可通过 SENTRY_TRACES_SAMPLE_RATE 调整（同时决定导出到 OTLP 的比例）
  tracesSampleRate: sampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1),

  // 只向后端注入链路头；附带 W3C traceparent，FastAPI 的 OTel instrumentation 据此续接同一条 trace
  tracePropagationTargets: [settings.BACKEND_INTERNAL_URL],
  propagateTraceparent: true,

  openTelemetrySpanProcessors: otlpEnabled
    ? [
        new BatchSpanProcessor(
          withServiceName(new OTLPTraceExporter(), "blog-frontend"),
        ),
      ]
    : [],

  debug: false,
});
