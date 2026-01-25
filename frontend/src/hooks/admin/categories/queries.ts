import { useQuery } from "@tanstack/react-query";
import { listCategoriesByType, PostType } from "@/shared/api/generated";

/**
 * 后台专用的分类列表查询
 */
export const useCategoriesQuery = (postType: PostType, enabled = true) => {
  return useQuery({
    queryKey: ["admin", "categories", postType],
    queryFn: async () => {
      const response = await listCategoriesByType({
        path: { post_type: postType },
        throwOnError: true,
      });
      return response.data;
    },
    enabled,
  });
};
