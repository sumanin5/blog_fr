import { useQuery } from "@tanstack/react-query";
import { listCategoriesByType } from "@/shared/api/generated/sdk.gen";
import { PostType } from "@/shared/api/generated/types.gen";
import { CategoryList } from "@/shared/api/types";
import { serverClient } from "@/lib/server-api-client";

/**
 * 后台专用的分类列表查询
 */
export const useCategoriesQuery = (postType: PostType, enabled = true) => {
  return useQuery({
    queryKey: ["admin", "categories", postType],
    queryFn: async () => {
      const response = await listCategoriesByType({
        client: serverClient,
        path: {
          post_type: postType,
        },
        query: {
          include_inactive: true, // 后台默认看到所有分类
        },
      });

      if (response.error) {
        throw response.error;
      }

      // 这里返回的是 Page[CategoryResponse]，已经在拦截器中转换成了 CamelCase 的 CategoryList
      return response.data as CategoryList;
    },
    enabled,
  });
};
