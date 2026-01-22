/**
 * 使用服务端 client 的示例
 *
 * 原始方式：
 * ❌ let url = `${settings.BACKEND_INTERNAL_URL}${settings.API_PREFIX}/posts/article?page=${page}&size=${size}`;
 *
 * 改进后：
 * ✅ 用 @hey-api 生成的函数 + serverClient
 */

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
  categoryId?: string
): Promise<ApiData<PagePostShortResponse> | null> {
  try {
    const { data: response, error } = await listPostsByType({
      path: {
        post_type: postType, // ← 路径参数
      },
      query: {
        page,
        size,
        category_id: categoryId, // ← 查询参数
      },
      client: serverClient, // ← 用服务端 client
      // 可选：覆盖缓存配置
      // next: { revalidate: 1800, tags: ['posts', `posts-${page}`] }
    });

    if (error) {
      console.error("Failed to fetch posts:", error);
      return null;
    }

    return response as unknown as ApiData<PagePostShortResponse>;
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return null;
  }
}

/**
 * 获取分类列表
 */
export async function getCategories(
  postType: PostType
): Promise<ApiData<PageCategoryResponse> | null> {
  try {
    const { data: response, error } = await listCategoriesByType({
      path: {
        post_type: postType, // ← 路径参数
      },
      client: serverClient,
    });

    if (error) {
      console.error("Failed to fetch categories:", error);
      return null;
    }

    return response as unknown as ApiData<PageCategoryResponse>;
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return null;
  }
}

// 获取文章详情
export const getPostDetail = cache(
  async (
    postType: string,
    slug: string
  ): Promise<ApiData<PostDetailResponse> | null> => {
    try {
      const { data, error } = await getPostBySlug({
        client: serverClient,
        path: {
          post_type: postType as PostType,
          slug: slug,
        },
      });

      if (error || !data) return null;
      return data as unknown as ApiData<PostDetailResponse>;
    } catch (error) {
      console.error(`[API] Failed to get post ${slug}:`, error);
      return null;
    }
  }
);
