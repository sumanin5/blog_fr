/**
 * 使用服务端 client 的示例
 *
 * 原始方式：
 * ❌ let url = `${settings.BACKEND_INTERNAL_URL}${settings.API_PREFIX}/posts/article?page=${page}&size=${size}`;
 *
 * 改进后：
 * ✅ 用 @hey-api 生成的函数 + serverClient
 */

import { notFound, redirect } from "next/navigation";
import { serverClient } from "@/lib/server-api-client";
import {
  listPostsByType,
  listCategoriesByType,
  getPostBySlug,
} from "@/shared/api/generated/sdk.gen";
import type {
  PagePostShortResponse,
  PageCategoryResponse,
  PostDetailResponse,
  PostType,
} from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";
import { cache } from "react";

/**
 * 获取文章列表
 *
 * 优点：
 * - 如果后端改了接口路径，重新生成 SDK 后自动更新
 * - 类型安全（TypeScript 检查参数）
 * - 自动转换 case 和缓存
 */
export async function getPosts(
  postType: PostType,
  page = 1,
  size = 10,
  categoryId?: string,
): Promise<ApiData<PagePostShortResponse>> {
  const { data: response, error } = await listPostsByType({
    path: {
      post_type: postType,
    },
    query: {
      page,
      size,
      category_id: categoryId,
    },
    client: serverClient,
  });

  if (error) {
    // 🚀 让错误冒泡到最近的 error.tsx 边界
    throw new Error(
      (error as any)?.error?.message || "无法获取文章列表，请稍后重试",
    );
  }

  return response as unknown as ApiData<PagePostShortResponse>;
}

/**
 * 获取分类列表
 */
export async function getCategories(
  postType: PostType,
): Promise<ApiData<PageCategoryResponse>> {
  const { data: response, error } = await listCategoriesByType({
    path: {
      post_type: postType,
    },
    client: serverClient,
  });

  if (error) {
    throw new Error((error as any)?.error?.message || "无法获取分类列表");
  }

  return response as unknown as ApiData<PageCategoryResponse>;
}

// 获取文章详情
export const getPostDetail = cache(
  async (
    postType: string,
    slug: string,
  ): Promise<ApiData<PostDetailResponse>> => {
    const { data, error } = await getPostBySlug({
      client: serverClient,
      path: {
        post_type: postType as PostType,
        slug: slug,
      },
    });

    if (error) {
      const errAny = error as any;
      const status = errAny.status || errAny.code || errAny.statusCode;
      const msg = errAny?.error?.message || errAny?.message || String(error);

      // 明确的 401 信号
      if (status === 401 || errAny?.error?.code === 401) {
        redirect("/login" as any);
      }

      // 明确的 404 信号
      if (
        status === 404 ||
        errAny?.error?.code === 404 ||
        /not found/i.test(msg)
      ) {
        notFound();
      }

      // 如果有其他明确错误信息，抛出异常
      if (msg && msg !== "{}" && msg !== "[object Object]") {
        throw new Error(msg);
      }

      // Fallthrough: 如果 error 是空对象且 data 为空，将在下面被捕获
    }

    if (!data) {
      notFound();
    }

    return data as unknown as ApiData<PostDetailResponse>;
  },
);
