import { PostType } from "@/shared/api/generated";
import { useCategoriesQuery } from "./queries";
import { useCategoryMutations } from "./mutations";
import { useAuth } from "@/hooks/use-auth";

/**
 * 分类运维板块的超级 Hook
 * 对齐 Media 板块的设计模式，提供统一的操作接口
 */
export const useCategoriesAdmin = (postType: PostType) => {
  const { user } = useAuth();

  // 仅超级管理员有权操作
  const isAuthorized = user?.role === "superadmin";

  const { data, isLoading, refetch, isFetching } = useCategoriesQuery(
    postType,
    isAuthorized
  );

  const mutations = useCategoryMutations(postType);

  return {
    categories: data?.items ?? [],
    pagination: {
      total: data?.total ?? 0,
      pages: data?.pages ?? 1,
      page: data?.page ?? 1,
    },
    isLoading: isLoading || authLoading(user),
    isFetching,
    refetch,
    isAuthorized,
    ...mutations,
  };
};

function authLoading(user: any) {
  return !user;
}
