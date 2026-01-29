import { useQuery } from "@tanstack/react-query";
import { getPostTypes, listPostsByType } from "@/shared/api";
import {
  PostTypeResponse,
  PostShortResponse,
} from "@/shared/api/generated/types.gen";
import { ApiData, normalizeApiResponse } from "@/shared/api/transformers";

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
      return response.data as unknown as PostTypeResponse[];
    },
    staleTime: Infinity, // 永久缓存，除非手动刷新
  });
}

/**
 * 全局搜索文章 (聚合 Articles 和 Ideas)
 */
export function useSearchPosts(query: string) {
  // 1. Fetch Articles
  const { data: articlesData, isLoading: isLoadingArticles } = useQuery({
    queryKey: ["posts", "articles", "search", query],
    queryFn: () =>
      listPostsByType({
        path: { post_type: "articles" },
        query: { search: query, size: 20 },
      }),
    enabled: !!query,
  });

  // 2. Fetch Ideas
  const { data: ideasData, isLoading: isLoadingIdeas } = useQuery({
    queryKey: ["posts", "ideas", "search", query],
    queryFn: () =>
      listPostsByType({
        path: { post_type: "ideas" },
        query: { search: query, size: 20 },
      }),
    enabled: !!query,
  });

  const isLoading = isLoadingArticles || isLoadingIdeas;

  // Combine Results
  // Note: We need to normalize data before merging if we want to sort by camelCase date,
  // or sort by snake_case then normalize. The API client from openapi-ts might not auto-normalize unless configured.
  // The transformer utility suggests manual normalization is needed if not done globally.
  // PostCard expects camelCase.

  const articlesRaw = articlesData?.data?.items || [];
  const ideasRaw = ideasData?.data?.items || [];

  const articles = normalizeApiResponse(
    articlesRaw,
  ) as ApiData<PostShortResponse>[];
  const ideas = normalizeApiResponse(ideasRaw) as ApiData<PostShortResponse>[];

  const allPosts = [...articles, ...ideas].sort(
    (a, b) =>
      new Date(b.publishedAt || "").getTime() -
      new Date(a.publishedAt || "").getTime(),
  );

  return {
    posts: allPosts,
    isLoading,
  };
}

/**
 * 获取首页精选文章
 */
export function useFeaturedPosts() {
  return useQuery({
    queryKey: ["posts", "articles", "featured"],
    queryFn: async () => {
      const response = await listPostsByType({
        path: { post_type: "articles" },
        query: { is_featured: true, size: 3 },
      });
      return normalizeApiResponse(
        response.data?.items || [],
      ) as ApiData<PostShortResponse>[];
    },
  });
}

/**
 * 获取首页精选想法
 */
export function useFeaturedThoughts() {
  return useQuery({
    queryKey: ["posts", "ideas", "featured"],
    queryFn: async () => {
      const response = await listPostsByType({
        path: { post_type: "ideas" },
        query: { is_featured: true, size: 4 },
      });
      return normalizeApiResponse(
        response.data?.items || [],
      ) as ApiData<PostShortResponse>[];
    },
  });
}
