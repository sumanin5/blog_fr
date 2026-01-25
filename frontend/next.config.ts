import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // 图片优化配置
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "www.ministryoftesting.com",
      },
      {
        protocol: "https",
        hostname: "*.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // 环境变量
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },

  // 严格模式
  reactStrictMode: true,

  // Next.js 16+: typedRoutes 从 experimental 移到了最顶层
  typedRoutes: true,

  // 生产优化
  poweredByHeader: false,
  compress: true,
  output: "standalone",

  // API 代理配置
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        }/api/:path*`,
      },
    ];
  },
};

// Sentry 插件配置
// 移除了过时的 disableLogger 和 automaticVercelMonitors 以消除 DEPRECATION 警告
export default withSentryConfig(nextConfig, {
  org: "your-org-name",
  project: "blog-fr-frontend",

  // 只在 CI 环境下不输出 Sentry 相关日志
  silent: !process.env.CI,

  // 优化选项
  widenClientFileUpload: true,

  // 注意：由于使用了 Turbopack，部分 Webpack 专有的 Tree-shaking 优化暂不可用
  // Sentry 会在后续版本中提供对 Turbopack 的完全支持
});
