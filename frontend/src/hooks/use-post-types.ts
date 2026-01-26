import { useQuery } from "@tanstack/react-query";
import { getPostTypes } from "@/shared/api";
import { PostTypeInfo } from "@/shared/api/types";

/**
 * 获取文章类型元数据 (Article, Idea 等)
 * 全站共享，因为类型列表几乎不发生变化，长期缓存。
 */
export function usePostTypes() {
  return useQuery({
    queryKey: ["global", "post-types"],
    queryFn: async () => {
      const response = await getPostTypes({ throwOnError: true });
      // 拦截器已处理 Case 转换，此处直接断言为业务模型数组
      return response.data as unknown as PostTypeInfo[];
    },
    staleTime: Infinity, // 永久缓存，除非手动刷新
  });
}
