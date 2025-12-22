import { createLazyFileRoute } from "@tanstack/react-router";
import BlogList from "@/pages/blog/BlogList";

export const Route = createLazyFileRoute("/blog/")({
  component: BlogList,
});
