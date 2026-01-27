import { client } from "./generated/client.gen";
import { settings } from "@/config/settings";
import Cookies from "js-cookie";
import { normalizeApiResponse, denormalizeApiRequest } from "./transformers";

// 定义 API 错误的结构
interface ApiError {
  code: string;
  message: string;
  details?: {
    validation_errors?: ValidationErrorDetail[];
    [key: string]: unknown;
  };
  request_id?: string;
  timestamp?: string;
}

// 统一的后端错误响应格式
interface ApiErrorResponse {
  error: ApiError;
}

// 类型守卫：判断一个对象是否符合后端定义的错误响应格式
function isApiErrorResponse(error: unknown): error is ApiErrorResponse {
  if (typeof error !== "object" || error === null) return false;

  const candidate = error as Record<string, unknown>;
  if (!("error" in candidate)) return false;

  const innerError = candidate.error as Record<string, unknown>;
  return (
    typeof innerError === "object" &&
    innerError !== null &&
    typeof innerError.code === "string" &&
    typeof innerError.message === "string"
  );
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

    // 获取响应类型
    const contentType = response.headers.get("content-type");
    const isJson = contentType?.includes("application/json");

    // 1. 如果不是 JSON，直接返回原始 response
    if (!isJson) {
      return response;
    }

    // 2. 只有是 JSON 时，我们才尝试解析并转换（包括错误响应）
    try {
      const data = await response.json();

      // ✅ 关键修复：即便是错误响应 (400, 401, 404等)，也要进行 Case 转换
      const normalizedData = normalizeApiResponse(data);

      return new Response(JSON.stringify(normalizedData), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
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
  // 💡 解决 TS(2339) 报错：
  // 这里的 req 在运行时包含 query/body 属性，但 TS 默认推断为原生 Request 类型。
  const request = req as unknown as {
    headers: Headers;
    query?: Record<string, unknown>;
  };

  if (typeof window !== "undefined") {
    const token = Cookies.get("access_token");
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
  }

  // ✅ 转换 Query 参数 (camelCase -> snake_case)
  // Query 参数是普通对象，可以安全转换
  if (request.query) {
    request.query = denormalizeApiRequest(request.query);
  }

  // ⚠️ 注意：我们不在这里转换 body，因为 body 可能是 ReadableStream
  // Body 的转换逻辑在调用 SDK 之前完成（在 mutations.ts 里）

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
  // 只有符合我们后端 ApiErrorResponse 格式的才处理
  if (isApiErrorResponse(error)) {
    // ✨ 现在 apiError 是类型安全的了
    const apiError = error.error;
    let finalMessage = apiError.message;

    // 处理 422 校验错误：把后端返回的字段错误数组拼成一句话
    if (
      apiError.code === "VALIDATION_ERROR" &&
      apiError.details?.validation_errors
    ) {
      const details = apiError.details.validation_errors
        .map((err) => `${err.field}: ${err.message}`)
        .join("; ");
      finalMessage = `校验失败: ${details}`;
    }

    // ✨ 使用自定义 ApiException 类，提供更好的类型安全
    throw new ApiException(finalMessage, apiError.code, response?.status);
  }

  // 如果不符合后端格式（比如网络断了），就原样抛出原始错误
  return error as Error;
});

export { client };
