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

  // 优化服务器组件编译 - Next.js 16 已移到顶层
  serverExternalPackages: ["mermaid"],

  // 文章板块统一收拢到专栏页；308 让搜索引擎把权重转移到目标页
  async redirects() {
    return [
      {
        source: "/posts/articles",
        destination: "/posts/articles/categories",
        permanent: true,
      },
    ];
  },

  // API 代理配置
  async rewrites() {
    // 优先读取内部网络地址，如果没有则回退到公开 API 地址，最后兜底到 Docker 内部默认地址
    const internalUrl =
      process.env.BACKEND_INTERNAL_URL || "http://backend:8000";
    const publicUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    // 如果处于 Docker 环境，我们应该优先使用内部通信地址
    const destination = `${internalUrl || publicUrl}/api/:path*`;

    return {
      // 文章的 Markdown 版本（面向爬虫与 LLM）：须先于 [slug] 动态路由匹配
      beforeFiles: [
        {
          source: "/posts/:postType/:slug.md",
          destination: "/posts/:postType/:slug/raw",
        },
        {
          source: "/posts/:postType/:slug.txt",
          destination: "/posts/:postType/:slug/txt",
        },
        {
          // /read/2 映射到 /read?part=2，避免嵌套动态 route handler 的注册问题
          source: "/posts/:postType/:slug/read/:part",
          destination: "/posts/:postType/:slug/read?part=:part",
        },
        {
          source: "/posts/:postType/:slug",
          has: [{ type: "header", key: "accept", value: ".*text/markdown.*" }],
          destination: "/posts/:postType/:slug/raw",
        },
        {
          source: "/posts/:postType/:slug",
          has: [{ type: "header", key: "accept", value: ".*text/plain.*" }],
          destination: "/posts/:postType/:slug/txt",
        },
      ],
      afterFiles: [
        {
          source: "/api/:path*",
          destination,
        },
      ],
      fallback: [],
    };
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
