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
    title: "博客列表",
    link: "/posts",
    icon: BookOpen,
    description: "前端深度架构、性能优化与开发随笔",
  },
  {
    title: "MDX 测试",
    link: "/test-mdx",
    icon: FileCode,
    description: "验证 MDX 与代码块渲染效果",
  },
];

export const MenuArray: MenuItem[] = [
  {
    title: "首页",
    link: "/",
    icon: Home,
    description: "返回首页",
  },
  {
    title: "博客",
    link: "/posts",
    icon: BookOpen,
    description: "技术文章与知识分享",
    items: BlogArray,
  },
  {
    title: "仪表盘",
    link: "/dashboard",
    icon: LayoutDashboard,
    description: "管理你的内容",
  },
  {
    title: "关于",
    link: "/about",
    icon: Info,
    description: "了解更多信息",
  },
];
