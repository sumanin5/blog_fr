import * as Sentry from "@sentry/nextjs";

const sampleRate = Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "");

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 性能采样：与服务端一致，默认 10%
  tracesSampleRate: Number.isFinite(sampleRate) ? sampleRate : 0.1,

  debug: false,
});
