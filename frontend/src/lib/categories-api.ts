import { serverClient } from "@/lib/server-api-client";
import { listCategoriesByType } from "@/shared/api/generated/sdk.gen";
import type {
  PageCategoryResponse,
  PostType,
} from "@/shared/api/generated/types.gen";
import { normalizeApiResponse, type ApiData } from "@/shared/api/transformers";

/**
 * 获取推荐分类
 */
export async function getFeaturedCategories(
  postType: PostType,
  limit = 3,
): Promise<ApiData<PageCategoryResponse>> {
  const { data: response, error } = await listCategoriesByType({
    path: {
      post_type: postType,
    },
    query: {
      is_featured: true,
    },
    client: serverClient,
    // Pass Next.js cache tags
    // @ts-ignore - The generated SDK might not explicitly type 'next' in options but client-fetch usually passes extra props
    next: {
      tags: ["categories"],
    },
  });

  if (error) {
    console.error("Failed to fetch featured categories:", error);
    // Return empty stricture matching ApiData<PageCategoryResponse>
    return {
      items: [],
      total: 0,
      page: 1,
      size: limit,
      pages: 0,
    } as unknown as ApiData<PageCategoryResponse>;
  }

  // Handle pagination limitation manually since we cannot filter by size in query
  if (response && response.items) {
    response.items = response.items.slice(0, limit);
  }

  return normalizeApiResponse(response);
}

/**
 * 获取所有分类
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

  return normalizeApiResponse(response);
}
