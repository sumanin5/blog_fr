/**
 * API 客户端配置文件
 *
 * ⚠️ 重要提示：
 * 这个文件是手动创建的，不是自动生成的！
 * 运行 `npm run api:generate` 后需要将此文件复制到 src/api/ 目录。
 *
 * 使用方法：
 * 1. 在 main.tsx 中导入: import './api/config'
 * 2. 之后所有 API 调用都会自动使用这里的配置
 */

import { client } from "./client.gen";

// ============================================================
// 1. 基础配置
// ============================================================
client.setConfig({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// ============================================================
// 2. 请求拦截器：自动添加 Token
// ============================================================
client.interceptors.request.use((request) => {
  // 从本地存储中读取许可证
  const token = localStorage.getItem("access_token");
  if (token) {
    // 在请求头中添加许可证
    request.headers.set("Authorization", `Bearer ${token}`);
  }
  return request;
});

// ============================================================
// 3. 响应拦截器：统一错误处理
// ============================================================
client.interceptors.response.use((response) => {
  // 如果返回 401 未授权错误
  if (response.status === 401) {
    // 清除本地存储中的许可证
    localStorage.removeItem("access_token");

    // 获取当前页面路径
    const path = window.location.pathname;

    // 排除不需要跳转的公开页面，避免无限循环
    const publicPaths = ["/login", "/register", "/forgot-password"];
    const isPublicPath = publicPaths.some((p) => path.includes(p));

    if (!isPublicPath) {
      window.location.href = "/login";
    }
  }
  return response;
});

export { client };
