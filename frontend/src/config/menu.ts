import { Home, BookOpen, LayoutDashboard, Info, FileCode } from "lucide-react";
import type React from "react";

export type MenuItem = {
  title: string;
  link: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  items?: MenuItem[];
};

export const BlogArray: MenuItem[] = [
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

export const MenuArray: MenuItem[] = [
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
