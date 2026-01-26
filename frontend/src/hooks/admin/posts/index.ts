import { PostType, PostUpdate as DomainPostUpdate } from "@/shared/api/types";
import {
  usePostsAdminQuery,
  useGlobalPostsAdminQuery,
  useMyPostsQuery,
  usePostDetailQuery,
} from "./queries";
import { usePostMutations } from "./mutations";

/**
 * 文章管理板块的超级 Hook
 * 统一管理创作、运维和列表逻辑
 */
export const usePostsAdmin = (
  postType?: PostType,
  {
    mode = "type",
    filters = {},
  }: {
    mode?: "type" | "me" | "all";
    filters?: Record<string, any>;
  } = {},
) => {
  // 1. 动态选择 Query Hook
  // 我们无法在 Hook 内部动态调用 Hook (Rules of Hooks)，所以可以在这里 switch
  // 或者让这三个 Hook 都接受 `enabled` 参数。
  // 但为了简化，我们可以单独 export，页面组件按需 import。
  // 如果非要封装在这里，需确保 Hooks 调用顺序一致。

  const typeQuery = usePostsAdminQuery(postType || "articles", filters);
  const meQuery = useMyPostsQuery(filters);
  const globalQuery = useGlobalPostsAdminQuery(filters);

  let activeResult;

  switch (mode) {
    case "me":
      activeResult = meQuery;
      break;
    case "all":
      activeResult = globalQuery;
      break;
    case "type":
    default:
      activeResult = typeQuery;
      break;
  }

  const { data, isLoading, refetch, isFetching } = activeResult;

  const mutations = usePostMutations();

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

/**
 * 单个文章管理的超级 Hook
 * 用于编辑页面，整合了获取详情、更新和删除逻辑
 */
export const usePostAdmin = (id: string) => {
  const {
    data: post,
    isLoading,
    error,
    refetch,
  } = usePostDetailQuery(id, true); // 默认包含 MDX

  const { updatePost, deletePost, isPending } = usePostMutations();

  return {
    post,
    isLoading,
    error,
    refetch,
    isSaving: isPending,
    // 预绑定 ID 的便捷方法
    update: (data: DomainPostUpdate) =>
      updatePost({
        id,
        type: (post?.postType as PostType) || "articles",
        data,
      }),
    delete: () =>
      deletePost({
        id,
        type: (post?.postType as PostType) || "articles",
      }),
  };
};

// 单独导出特定的列表钩子，方便不同页面使用
export {
  usePostsAdminQuery,
  useGlobalPostsAdminQuery,
  useMyPostsQuery,
  usePostDetailQuery,
};
