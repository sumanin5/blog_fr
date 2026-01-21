import { client } from "./generated/client.gen";
import { settings } from "@/config/settings";
import Cookies from "js-cookie";

// 定义错误处理接口
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    request_id?: string;
    timestamp?: string;
  };
}

/**
 * 初始化 API 客户端
 * 根据环境自动选择 Base URL
 */
const baseUrl =
  typeof window === "undefined"
    ? settings.BACKEND_INTERNAL_URL
    : settings.NEXT_PUBLIC_API_URL;

client.setConfig({
  baseUrl: baseUrl,

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
    const token = Cookies.get("access_token");
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return request;
});

/**
 * 响应拦截器：处理 Token 失效
 */
/**
 * 响应拦截器：只处理“状态同步”相关的副作用
 */
client.interceptors.response.use((response) => {
  // 专门处理 401 清理 Token
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
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
    let finalMessage = error.error.message;

    // 处理 422 校验错误：把后端返回的字段错误数组拼成一句话
    if (
      error.error.code === "VALIDATION_ERROR" &&
      error.error.details?.validation_errors
    ) {
      const details = error.error.details.validation_errors
        .map((err: any) => `${err.field}: ${err.message}`)
        .join("; ");
      finalMessage = `校验失败: ${details}`;
    }

    // 构造带“人话”的 Error 对象
    const customError = new Error(finalMessage);

    // 把后端给的 code 也挂载上去，万一前端需要对特定 code 做逻辑（比如弹窗、刷新等）
    (customError as any).code = error.error.code;
    (customError as any).status = response?.status;

    // 这一抛出去，TanStack Query 的 onError 接到的就是 customError
    throw customError;
  }

  // 如果不符合后端格式（比如网络断了），就原样抛出原始错误
  return error;
});
export { client };
