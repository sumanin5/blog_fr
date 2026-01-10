/**
 * 全栈配置文件 - 前端版
 *
 * 参照后端 /backend/app/core/config.py 的设计理念，
 * 集中管理所有环境变量和常量配置。
 */

export const settings = {
  // 后端 API 基础地址 (SSR 时使用内网地址)
  // 如果在生产环境 Docker 中，BACKEND_INTERNAL_URL 应为 http://backend:8000
  BACKEND_INTERNAL_URL:
    process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000",

  // 浏览器端访问的基础地址
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",

  // API 版本与前缀（与后端保持同步）
  API_VERSION: process.env.API_VERSION || "v1",
  API_PREFIX: process.env.API_PREFIX || "/api/v1",

  // 媒体文件地址前缀
  MEDIA_URL: process.env.MEDIA_URL || "http://localhost:8000/media/",
} as const;
