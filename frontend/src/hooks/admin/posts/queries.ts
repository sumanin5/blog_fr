import { useQuery } from "@tanstack/react-query";
import {
  listPostsByTypeAdmin,
  listAllPostsAdmin,
  getMyPosts,
  PostType,
} from "@/shared/api/generated";
import { AdminPostFilters, MyPostFilters } from "@/shared/api/types";
import {
  normalizeApiResponse,
  denormalizeApiRequest,
} from "@/shared/api/transformers";

/**
 * 1. 获取指定板块的文章列表 (管理员视角)
 */
export const usePostsAdminQuery = (
  postType: PostType,
  filters?: AdminPostFilters
) => {
  return useQuery({
    queryKey: ["admin", "posts", postType, filters],
    queryFn: async () => {
      const response = await listPostsByTypeAdmin({
        path: denormalizeApiRequest({ post_type: postType }),
        query: denormalizeApiRequest(filters),
        throwOnError: true,
      });
      return normalizeApiResponse(response.data);
    },
  });
};

/**
 * 2. 获取跨板块的全局文章列表 (超级管理员视角)
 */
export const useGlobalPostsAdminQuery = (filters?: AdminPostFilters) => {
  return useQuery({
    queryKey: ["admin", "posts", "all", filters],
    queryFn: async () => {
      const response = await listAllPostsAdmin({
        query: denormalizeApiRequest(filters),
        throwOnError: true,
      });
      return normalizeApiResponse(response.data);
    },
  });
};

/**
 * 3. 获取当前用户的文章列表 (作者视角)
 */
export const useMyPostsQuery = (filters?: MyPostFilters) => {
  return useQuery({
    queryKey: ["admin", "posts", "me", filters],
    queryFn: async () => {
      const response = await getMyPosts({
        query: denormalizeApiRequest(filters),
        throwOnError: true,
      });
      return normalizeApiResponse(response.data);
    },
  });
};
