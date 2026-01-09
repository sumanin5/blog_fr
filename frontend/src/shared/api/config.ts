import { client } from "./generated/client.gen";

// 后端 API 基础路径
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * 初始化 API 客户端
 */
client.setConfig({
  baseUrl: API_BASE_URL,
});

/**
 * 请求拦截器：自动注入 Token
 */
client.interceptors.request.use((request) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return request;
});

/**
 * 响应拦截器：处理 Token 失效
 */
client.interceptors.response.use((response) => {
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      // 注意：这里不直接跳转，由 hooks 处理
    }
  }
  return response;
});

export { client };
