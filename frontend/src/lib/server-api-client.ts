/**
 * 服务端 API 客户端
 *
 * 用途：
 * - 在 Server Components 中调用后端 API
 * - 复用 @hey-api 生成的函数
 * - 自动进行 ISR 缓存和数据转换
 *
 * 原理：
 * @hey-api 生成的函数需要一个 client 实例来执行请求
 * 这里创建的是专门用于服务端的 client（有不同的配置）
 */

import { createClient, type Client } from "@/shared/api/generated/client";
import { settings } from "@/config/settings";
import { normalizeApiResponse } from "@/shared/api/transformers";

import { cookies } from "next/headers";

/**
 * 创建服务端 API 客户端实例
 *
 * 特点：
 * 1. 使用服务端的 baseUrl（内网地址）
 * 2. 自动转换响应数据 snake_case → camelCase
 * 3. 配置 ISR 缓存和标签
 * 4. 自动注入 Token（如果有）
 */
export const serverClient = createClient({
  baseUrl: settings.BACKEND_INTERNAL_URL,
}) as Client;

/**
 * 自定义 fetch 方法：添加 ISR 缓存、Token 注入和自动转换
 */
serverClient.setConfig({
  fetch: async (input, init) => {
    // 动态获取 Token
    let token = undefined;
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("access_token")?.value;
    } catch {
      // 这里的 try-catch 是为了防止在一些非请求生命周期中调用报错(如构建时)
      // 但对于服务端组件渲染，它是正常的
    }

    // 构造新的 Headers
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json"); // 确保默认有 Content-Type
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // 执行请求
    const response = await fetch(input, {
      ...init,
      headers: headers,
      // ✅ Next.js ISR 配置：默认缓存 1 小时
      next: {
        revalidate: 3600,
        tags: ["api"],
      },
    });

    // 如果响应失败，直接返回
    if (!response.ok) {
      return response;
    }

    // ✅ 自动转换响应数据：snake_case → camelCase
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        const data = await response.json();
        const converted = normalizeApiResponse(data);

        // 返回转换后的数据
        return new Response(JSON.stringify(converted), {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers(response.headers),
        });
      } catch {
        // JSON 解析失败，返回原始响应
        return response;
      }
    }

    return response;
  },
});

export default serverClient;
