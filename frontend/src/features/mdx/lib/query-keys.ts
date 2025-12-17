import { createQueryKeyFactory } from "@/shared/lib/query-key-factory";

/**
 * MDX 相关的查询键
 */
const factory = createQueryKeyFactory("mdx");

export const mdxQueryKeys = {
  ...factory,
  // MDX 内容
  content: (path: string) => factory.custom("content", path),
  // MDX 目录
  toc: (path: string) => factory.custom("toc", path),
} as const;
