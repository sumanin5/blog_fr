import { Home, BookOpen, Info, Lightbulb, FileText } from "lucide-react";
import type React from "react";
import type { PostType } from "@/shared/api";

export type MenuItem = {
  title: string;
  link: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  items?: MenuItem[];
};

/**
 * 后端支持的 PostType 配置
 */
const POST_TYPE_CONFIG: Record<
  PostType,
  { title: string; description: string; icon: React.ComponentType }
> = {
  articles: {
    title: "博客文章",
    description: "深度思考与技术分享",
    icon: BookOpen,
  },
  ideas: {
    title: "想法感悟",
    description: "碎片化的灵感、随笔与日常吐槽",
    icon: Lightbulb,
  },
};

/**
 * 动态生成 PostType 相关的子菜单
 */
function generatePostTypeMenuItems(): MenuItem[] {
  return (Object.entries(POST_TYPE_CONFIG) as [PostType, MenuItem][]).map(
    ([postType, config]) => ({
      title: config.title,
      link: `/posts/${postType}/categories`,
      description: config.description,
      icon: config.icon,
      items: [
        {
          title: "全部文章",
          link: `/posts/${postType}`,
          description: `浏览所有${config.title}`,
          icon: FileText,
        },
      ],
    }),
  );
}

export const MenuArray: MenuItem[] = [
  {
    title: "首页",
    link: "/",
    icon: Home,
    description: "返回首页",
  },
  ...generatePostTypeMenuItems(),
  {
    title: "关于",
    link: "/about",
    icon: Info,
    description: "了解更多更多关于本站的信息",
  },
];
