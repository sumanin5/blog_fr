import { useQuery } from "@tanstack/react-query";
import { listCategoriesByType } from "@/shared/api/generated/sdk.gen";
import {
  PostType,
  ListCategoriesByTypeData,
} from "@/shared/api/generated/types.gen";
import { normalizeApiResponse } from "@/shared/api/transformers";

/**
 * 后台专用的分类列表查询
 */
export const useCategoriesQuery = (
  postType: PostType,
  enabled = true,
  includeInactive = true,
) => {
  return useQuery({
    queryKey: ["admin", "categories", postType, { includeInactive }],
    queryFn: async () => {
      const response = await listCategoriesByType({
        path: {
          post_type: postType,
        },
        query: {
          include_inactive: includeInactive, // 后台默认看到所有分类
        } as unknown as ListCategoriesByTypeData["query"],
        throwOnError: true,
      });

      return normalizeApiResponse(response.data);
    },
    enabled,
  });
};
