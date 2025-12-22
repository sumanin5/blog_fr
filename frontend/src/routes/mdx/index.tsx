import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mdx/")({
  beforeLoad: () => {
    throw redirect({ to: "/mdx/showcase" });
  },
});
