import * as Sentry from "@sentry/nextjs";

// Turbopack 下浏览器端配置只从 instrumentation-client.ts 加载（取代 sentry.client.config.ts）
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 性能采样：生产环境按 10% 采样，避免耗尽 Sentry 配额
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // 捕获错误时的重放 (Session Replay)
  // 开发环境下建议采样率为 0，生产环境可以设为 0.1
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // 过滤一些不必要的错误
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],

  debug: false,
});

// 记录客户端路由切换的导航耗时
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
