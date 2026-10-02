import { client } from "./generated/client.gen";
import { settings } from "@/config/settings";
import Cookies from "js-cookie";
import { normalizeApiResponse } from "./transformers";

import { ApiException, readApiError } from "./errors";

/**
 * 初始化 API 客户端
 * 根据环境自动选择 Base URL
 * SSR (服务端) -> 使用内部 Docker 网络地址 (http://backend:8000)
 * Client (浏览器) -> 使用外部公开地址 (http://localhost:8080 或 域名)
 */
const isServer = typeof window === "undefined";
const baseUrl = isServer
  ? settings.BACKEND_INTERNAL_URL
  : settings.NEXT_PUBLIC_API_URL;

client.setConfig({
  baseUrl: baseUrl,

  fetch: async (input, init) => {
    const response = await fetch(input, { ...init, cache: "no-store" });

    // 获取响应类型
    const contentType = response.headers.get("content-type");
    const isJson = contentType?.includes("application/json");

    // 1. 如果不是 JSON，直接返回原始 response
    if (!isJson) {
      return response;
    }

    // 2. 只有是 JSON 时，我们才尝试解析并转换（包括错误响应）
    try {
      const data: unknown = await response.clone().json();

      // ✅ 关键修复：即便是错误响应 (400, 401, 404等)，也要进行 Case 转换
      const normalizedData = normalizeApiResponse(data);

      const headers = new Headers(response.headers);
      headers.delete("content-length");
      headers.delete("content-encoding");
      return new Response(JSON.stringify(normalizedData), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch {
      // JSON 解析失败，返回原始 response
      return response;
    }
  },
});

/**
 * 请求拦截器：自动注入 Token 和转换 Query 参数
 */
client.interceptors.request.use((req) => {
  if (typeof window !== "undefined") {
    const token = Cookies.get("access_token");
    if (token) req.headers.set("Authorization", `Bearer ${token}`);
  }
  // Query/body conversion belongs to the typed caller, before Request serialization.

  return req;
});

/**
 * 响应拦截器：处理 Token 失效
 */
client.interceptors.response.use((response) => {
  // 专门处理 401 清理 Token
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      Cookies.remove("access_token");
    }
  }
  return response;
});

/**
 * 错误拦截器：专门处理“翻译人话”！
 */
client.interceptors.error.use((error: unknown, response) => {
  const failure = readApiError(error, "请求失败", response?.status);
  if (failure.code) {
    const message = failure.code === "VALIDATION_ERROR" && failure.validationErrors.length
      ? `校验失败: ${failure.validationErrors.map((issue) => `${issue.field}: ${issue.message}`).join("; ")}`
      : failure.message;
    throw new ApiException(message, failure.code, failure.status, { validationErrors: failure.validationErrors });
  }
  return error;

});

export { client };
