import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 性能采样
  tracesSampleRate: 1.0,

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
