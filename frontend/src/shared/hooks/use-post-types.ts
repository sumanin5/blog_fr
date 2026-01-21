import { useQuery } from "@tanstack/react-query";
import { getPostTypes } from "@/shared/api/generated/sdk.gen";
import { PostTypeResponse } from "@/shared/api/generated";

/**
 * 获取文章类型列表 (从后端元数据接口)
 */
export function usePostTypes() {
  return useQuery({
    queryKey: ["post-types"],
    queryFn: async () => {
      const response = await getPostTypes();
      if (response.error) throw response.error;
      return response.data as PostTypeResponse[];
    },
    staleTime: Infinity, // 类型列表变化极少，可以长期缓存
  });
}
