import * as Sentry from "@sentry/nextjs";

const SERVICE_NAME = "blog-frontend";

/**
 * Next.js 服务端启动钩子
 *
 * 链路追踪按配置二选一（两者都会注册全局 TracerProvider，不能同时启用）：
 * - 配置了 Sentry DSN：由 Sentry 接管 OpenTelemetry，并在配置 OTLP 端点时追加导出
 *   （见 sentry.server.config.ts）。Sentry 未配置 DSN 时不会创建 fetch span，也不注入链路头。
 * - 仅配置 OTEL_EXPORTER_OTLP_ENDPOINT：使用 @vercel/otel，向后端请求注入 W3C traceparent，
 *   FastAPI 侧的 OTel instrumentation 据此把前后端串成同一条 trace。
 */
export async function register() {
  const sentryEnabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (sentryEnabled) {
      await import("../sentry.server.config");
    } else if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      const [{ registerOTel }, { settings }] = await Promise.all([
        import("@vercel/otel"),
        import("@/config/settings"),
      ]);
      registerOTel({
        serviceName: SERVICE_NAME,
        instrumentationConfig: {
          fetch: { propagateContextUrls: [settings.BACKEND_INTERNAL_URL] },
        },
      });
    }
  }

  if (process.env.NEXT_RUNTIME === "edge" && sentryEnabled) {
    await import("../sentry.edge.config");
  }
}

// 捕获 Server Component / Route Handler / Server Action 中未处理的错误（未配置 DSN 时为空操作）
export const onRequestError = Sentry.captureRequestError;
