import { useQuery } from "@tanstack/react-query";
import { listCategoriesByType, PostType } from "@/shared/api/generated";

/**
 * 获取指定类型的分类列表
 */
export function useCategories(postType: PostType) {
  return useQuery({
    queryKey: ["categories", postType],
    queryFn: async () => {
      const response = await listCategoriesByType({
        path: { post_type: postType },
      });
      return response.data?.items || [];
    },
  });
}
