import { Home, BookOpen, Info, Lightbulb, Rocket } from "lucide-react";
import type React from "react";

export type MenuItem = {
  title: string;
  link: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  items?: MenuItem[];
};

export const MenuArray: MenuItem[] = [
  {
    title: "首页",
    link: "/",
    icon: Home,
    description: "返回首页",
  },
  {
    title: "专栏专题",
    link: "/posts/articles/categories",
    icon: BookOpen,
    description: "体系化深度思考与工程实践专题",
  },
  {
    title: "想法流",
    link: "/posts/ideas",
    icon: Lightbulb,
    description: "按领域沉淀的灵感随笔与即时思考",
  },
  {
    title: "精选项目",
    link: "/projects",
    icon: Rocket,
    description: "独立孵化与开源的高质量工具与解决方案",
  },
  {
    title: "关于",
    link: "/about",
    icon: Info,
    description: "关于作者与本站的理念与技术架构",
  },
];
