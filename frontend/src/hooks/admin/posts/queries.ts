import { normalizeApiResponse } from "@/shared/api/transformers";
import { useQuery } from "@tanstack/react-query";
import {
  listPostsByTypeAdmin,
  listAllPostsAdmin,
  getMyPosts,
  getPostById,
} from "@/shared/api";
import { AdminPostFilters, MyPostFilters, PostType } from "@/shared/api/types";
import type {
  GetPostByIdData,
  ListPostsByTypeAdminData,
  ListAllPostsAdminData,
  GetMyPostsData,
} from "@/shared/api/generated/types.gen";

/**
 * 1. 获取指定板块的文章列表 (管理员视角)
 */
export const usePostsAdminQuery = (
  postType: PostType,
  filters?: AdminPostFilters,
) => {
  return useQuery({
    queryKey: ["admin", "posts", postType, filters],
    queryFn: async () => {
      const response = await listPostsByTypeAdmin({
        path: {
          post_type: postType,
        },
        // ✅ 拦截器已自动处理，不再手动转换
        query: filters as unknown as ListPostsByTypeAdminData["query"],
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
        // ✅ 同上，享受自动化
        query: filters as unknown as ListAllPostsAdminData["query"],
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
        // ✅ 逻辑对齐
        query: filters as unknown as GetMyPostsData["query"],
        throwOnError: true,
      });
      return normalizeApiResponse(response.data);
    },
  });
};

/**
 * 4. 获取文章详情 (自动探测类型)
 */
export const usePostDetailQuery = (id: string, includeMdx = true) => {
  return useQuery({
    queryKey: ["admin", "post", id, { includeMdx }],
    queryFn: async () => {
      const results = await Promise.allSettled([
        getPostById({
          path: {
            post_type: "articles",
            post_id: id,
          },
          query: {
            include_mdx: includeMdx,
          } as unknown as GetPostByIdData["query"],
        }),
        getPostById({
          path: {
            post_type: "ideas",
            post_id: id,
          },
          query: {
            include_mdx: includeMdx,
          } as unknown as GetPostByIdData["query"],
        }),
      ]);

      // 🔍 排除 any：直接查找包含数据的成功结果
      const success = results.find(
        (r) =>
          r.status === "fulfilled" &&
          // value exists on fulfilled result, and data exists on the response
          !!r.value?.data,
      );

      if (!success || success.status !== "fulfilled" || !success.value.data) {
        throw new Error("文章不存在或无法访问");
      }

      return normalizeApiResponse(success.value.data);
    },
    enabled: !!id,
    retry: 1,
  });
};
