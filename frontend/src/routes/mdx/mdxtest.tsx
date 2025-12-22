import { createFileRoute } from "@tanstack/react-router";
import MDXTestClean from "@/pages/mdx/MDXTestClean";
export const Route = createFileRoute("/mdx/mdxtest")({
  component: MDXTestClean,
});
