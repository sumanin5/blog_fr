import { PostType } from "@/shared/api/generated";
import {
  usePostsAdminQuery,
  useGlobalPostsAdminQuery,
  useMyPostsQuery,
} from "./queries";
import { usePostMutations } from "./mutations";

/**
 * 文章管理板块的超级 Hook
 * 统一管理创作、运维和列表逻辑
 */
export const usePostsAdmin = (postType?: PostType) => {
  // 根据身份决定调用哪个列表
  // 超级管理员默认看全局，普通作者看自己的
  const { data, isLoading, refetch, isFetching } = usePostsAdminQuery(
    postType || ("article" as PostType)
  );

  const mutations = usePostMutations(postType);

  return {
    posts: data?.items ?? [],
    pagination: {
      total: data?.total ?? 0,
      pages: data?.pages ?? 1,
      page: data?.page ?? 1,
    },
    isLoading,
    isFetching,
    refetch,
    ...mutations,
  };
};

// 单独导出特定的列表钩子，方便不同页面使用
export { usePostsAdminQuery, useGlobalPostsAdminQuery, useMyPostsQuery };
