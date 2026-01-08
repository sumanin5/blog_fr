import { createFileRoute } from "@tanstack/react-router";
import MDXShowcase from "@/pages/mdx/MDXShowcase";
export const Route = createFileRoute("/mdx/showcase")({
  component: MDXShowcase,
});
