import { createQueryKeyFactory } from "@/shared/lib/query-key-factory";

/**
 * 博客相关的查询键
 */
const factory = createQueryKeyFactory("blog");

export const blogQueryKeys = {
  ...factory,
  // 博客文章列表
  posts: (filters?: Record<string, unknown>) => factory.list(filters),
  // 单篇博客文章
  post: (id: string) => factory.detail(id),
  // 博客分类
  categories: () => factory.custom("categories"),
  // 博客标签
  tags: () => factory.custom("tags"),
} as const;
