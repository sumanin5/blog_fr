import { client } from "./generated/client.gen";
import { settings } from "@/config/settings";

/**
 * 初始化 API 客户端
 */
client.setConfig({
  baseUrl: settings.NEXT_PUBLIC_API_URL,

  /**
   * 自定义 fetch 配置
   * 禁用 Next.js 缓存，让 React Query 完全管理缓存
   */
  fetch: async (input, init) => {
    return fetch(input, {
      ...init,
      cache: "no-store", // 禁用 Next.js 数据缓存
    });
  },
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
