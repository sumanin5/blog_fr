import { createFileRoute } from "@tanstack/react-router";
import BlogDetail from "@/pages/blog/BlogDetail";
export const Route = createFileRoute("/blog/$id")({
  component: BlogDetail,
});
