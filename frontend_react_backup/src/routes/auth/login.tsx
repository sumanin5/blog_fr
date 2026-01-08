import { createFileRoute } from "@tanstack/react-router";
import Login from "@/pages/auth/Login";

export const Route = createFileRoute("/auth/login")({
  component: Login,
});
