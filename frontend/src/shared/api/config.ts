import { client } from "./generated/client.gen";
import { settings } from "@/config/settings";
import Cookies from "js-cookie";
import { normalizeApiResponse, denormalizeApiRequest } from "./transformers";

// 定义 API 错误的结构
interface ApiError {
  code: string;
  message: string;
  details?: any;
  request_id?: string;
  timestamp?: string;
}

// 定义验证错误的结构
interface ValidationErrorDetail {
  field: string;
  message: string;
  type?: string;
}

// 自定义 API 异常类
class ApiException extends Error {
  code: string;
  status?: number;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, ApiException.prototype);
  }
}

/**
 * 初始化 API 客户端
 * 根据环境自动选择 Base URL
 */
client.setConfig({
  baseUrl: settings.NEXT_PUBLIC_API_URL,

  fetch: async (input, init) => {
    const response = await fetch(input, { ...init, cache: "no-store" });
    // 2. 如果不是 JSON，直接返回
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType?.includes("application/json")) {
      return response;
    }
    const data = await response.json();
    const normalizedData = normalizeApiResponse(data);
    const clonedResponse = new Response(JSON.stringify(normalizedData), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    return clonedResponse;
  },
});

/**
 * 请求拦截器：自动注入 Token
 */
client.interceptors.request.use((request) => {
  if (typeof window !== "undefined") {
    const token = Cookies.get("access_token");
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
  }
  if (request.body && typeof request.body === "string") {
    try {
      const parsed = JSON.parse(request.body);
      const denormalized = denormalizeApiRequest(parsed);
      (request as any).body = JSON.stringify(denormalized);
    } catch (error) {
      // 如果解析失败，保持原样
    }
  }
  return request;
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
client.interceptors.error.use((error: any, response) => {
  // 只有符合我们后端 ApiErrorResponse 格式的才处理
  if (error?.error) {
    // ✨ 直接对应 ApiError 接口
    const apiError = error.error as ApiError;
    let finalMessage = apiError.message;

    // 处理 422 校验错误：把后端返回的字段错误数组拼成一句话
    if (
      apiError.code === "VALIDATION_ERROR" &&
      apiError.details?.validation_errors
    ) {
      const details = (
        apiError.details.validation_errors as ValidationErrorDetail[]
      )
        .map((err) => `${err.field}: ${err.message}`)
        .join("; ");
      finalMessage = `校验失败: ${details}`;
    }

    // ✨ 使用自定义 ApiException 类，提供更好的类型安全
    throw new ApiException(finalMessage, apiError.code, response?.status);
  }

  // 如果不符合后端格式（比如网络断了），就原样抛出原始错误
  return error;
});
export { client };
