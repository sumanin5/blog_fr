import { useQuery } from "@tanstack/react-query";
import { listCategoriesByType } from "@/shared/api";
import { PostType, CategoryList } from "@/shared/api/types";
import type { ListCategoriesByTypeData } from "@/shared/api/generated/types.gen";

/**
 * 后台专用的分类列表查询
 */
export const useCategoriesQuery = (postType: PostType, enabled = true) => {
  return useQuery({
    queryKey: ["admin", "categories", postType],
    queryFn: async () => {
      const response = await listCategoriesByType({
        path: {
          post_type: postType,
        } as unknown as ListCategoriesByTypeData["path"],
        throwOnError: true,
      });
      // 拦截器已处理转换，直接断言为业务模型
      return response.data as unknown as CategoryList;
    },
    enabled,
  });
};
