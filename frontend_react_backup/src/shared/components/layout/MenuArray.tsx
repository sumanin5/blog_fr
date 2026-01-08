import { Home, BookOpen, LayoutDashboard, Info, FileCode } from "lucide-react";
import type React from "react";

import { type FileRouteTypes } from "@/routeTree.gen";

export type MenuItems = {
  title: string;
  link: FileRouteTypes["to"];
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  items?: MenuItems[];
};

export const BlogArray: MenuItems[] = [
  {
    title: "blog",
    link: "/blog",
    icon: BookOpen,
    description: "前端深度架构、性能优化与开发随笔",
  },
  {
    title: "mdx",
    link: "/mdx/showcase",
    icon: FileCode,
    description: "MDX 示例",
  },
];

export const MenuArray: MenuItems[] = [
  {
    title: "Home",
    link: "/",
    icon: Home,
    description: "Home",
  },
  {
    title: "Blog",
    link: "/blog",
    icon: BookOpen,
    description: "Blog",
    items: BlogArray,
  },
  {
    title: "Dashboard",
    link: "/dashboard",
    icon: LayoutDashboard,
    description: "Dashboard",
  },
  {
    title: "About",
    link: "/about",
    icon: Info,
    description: "About",
  },
];
