import { queryOptions } from "@tanstack/react-query";

export const fetchBlogsQueryOptions = () =>
  queryOptions({
    queryKey: ["blogs"],
    queryFn: async () => {
      // 模拟网络延迟
      await new Promise((r) => setTimeout(r, 500));
      return [
        { id: 1, title: "我的第一篇 TanStack 博客" },
        { id: 2, title: "如何优化路由性能" },
      ];
    },
  });
