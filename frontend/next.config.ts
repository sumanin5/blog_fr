import type { NextConfig } from "next";

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
  experimental: {
    typedRoutes: true,
  },

  // 生产优化
  poweredByHeader: false,
  compress: true,
  output: "standalone",

  // API 代理配置
  // 注意：这个 rewrites 是用于客户端请求（浏览器 → Next.js → 后端）
  // 服务端渲染时不使用，而是直接用 serverClient（见 src/lib/server-api-client.ts）
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

export default nextConfig;
