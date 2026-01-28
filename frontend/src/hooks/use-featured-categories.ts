import { useQuery } from "@tanstack/react-query";
import { listCategoriesByType } from "@/shared/api/generated/sdk.gen";
import { CategoryList } from "@/shared/api/types";

/**
 * 获取首页推荐分类 (Featured Categories)
 * 这是一个 Public Hook，用于客户端组件
 */
export const useFeaturedCategories = () => {
  return useQuery({
    queryKey: ["public", "categories", "featured"],
    queryFn: async () => {
      // 并行获取文章和想法的推荐分类
      const [articlesResponse, ideasResponse] = await Promise.all([
        listCategoriesByType({
          path: { post_type: "articles" },
          query: {
            is_featured: true,
            include_inactive: false,
          } as any,
        }),
        listCategoriesByType({
          path: { post_type: "ideas" },
          query: {
            is_featured: true,
            include_inactive: false,
          } as any,
        }),
      ]);

      const articlesError = articlesResponse.error;
      const ideasError = ideasResponse.error;

      if (articlesError || ideasError) {
        console.error(
          "Featured categories fetch error:",
          articlesError || ideasError,
        );
        // 如果两个都失败，抛出错误；如果只有一个失败，降级处理（这里简化为抛出）
        throw articlesError || ideasError;
      }

      const articles =
        (articlesResponse.data?.items as unknown as CategoryList["items"]) ||
        [];
      const ideas =
        (ideasResponse.data?.items as unknown as CategoryList["items"]) || [];

      // 合并结果
      const allFeatured = [...articles, ...ideas];

      console.log("Featured categories fetched (All):", allFeatured.length);

      // 构造符合 CategoryList 接口的返回对象
      return {
        items: allFeatured,
        total: allFeatured.length,
        size: allFeatured.length,
        page: 1,
        pages: 1,
      } as unknown as CategoryList;
    },
    // 设置较长的 staleTime，因为推荐分类不会频繁变动
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
