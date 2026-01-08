import { createFileRoute } from "@tanstack/react-router";
import { fetchBlogsQueryOptions } from "@/features/blog/queries";

export const Route = createFileRoute("/blog/")({
  // 🟢 这一步会在用户点击瞬间（或悬停瞬间）就开始执行发请求
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(fetchBlogsQueryOptions()),
});
