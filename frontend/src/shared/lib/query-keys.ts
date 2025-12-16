/**
 * TanStack Query 查询键管理
 *
 * 统一管理所有查询键，避免重复和冲突
 * 使用工厂函数模式，便于维护和类型安全
 */
export const queryKeys = {
  // 用户相关查询
  user: {
    // 所有用户相关查询的根键
    all: ["user"] as const,
    // 当前用户信息
    current: () => [...queryKeys.user.all, "current"] as const,
    // 用户详情（按 ID）
    detail: (id: string) => [...queryKeys.user.all, "detail", id] as const,
    // 用户列表
    list: (filters?: Record<string, any>) =>
      [...queryKeys.user.all, "list", filters] as const,
  },

  // 认证相关查询
  auth: {
    all: ["auth"] as const,
    // 认证状态
    status: () => [...queryKeys.auth.all, "status"] as const,
  },

  // 博客相关查询
  blog: {
    all: ["blog"] as const,
    // 博客文章列表
    posts: (filters?: Record<string, any>) =>
      [...queryKeys.blog.all, "posts", filters] as const,
    // 单篇博客文章
    post: (id: string) => [...queryKeys.blog.all, "post", id] as const,
    // 博客分类
    categories: () => [...queryKeys.blog.all, "categories"] as const,
    // 博客标签
    tags: () => [...queryKeys.blog.all, "tags"] as const,
  },

  // MDX 相关查询
  mdx: {
    all: ["mdx"] as const,
    // MDX 内容
    content: (path: string) => [...queryKeys.mdx.all, "content", path] as const,
    // MDX 目录
    toc: (path: string) => [...queryKeys.mdx.all, "toc", path] as const,
  },
} as const;
