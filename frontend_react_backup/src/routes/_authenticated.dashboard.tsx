import { createFileRoute } from "@tanstack/react-router";
import DashBoard from "@/pages/DashBoard";
export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashBoard,
});
