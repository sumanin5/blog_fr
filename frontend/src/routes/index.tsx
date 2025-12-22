// src/routes/index.tsx
import { createFileRoute } from "@tanstack/react-router";
// 假设这是你原来的首页组件 import 路径
import Home from "@/pages/HomePage";

export const Route = createFileRoute("/")({
  component: Home,
});
