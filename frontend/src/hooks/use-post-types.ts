import { useQuery } from "@tanstack/react-query";
import { getPostTypes } from "@/shared/api/generated";

/**
 * 获取文章类型元数据 (Article, Idea 等)
 * 全站共享，因为类型列表几乎不发生变化，长期缓存。
 */
export function usePostTypes() {
  return useQuery({
    queryKey: ["global", "post-types"],
    queryFn: async () => {
      const response = await getPostTypes({ throwOnError: true });
      return response.data;
    },
    staleTime: Infinity, // 永久缓存，除非手动刷新
  });
}
