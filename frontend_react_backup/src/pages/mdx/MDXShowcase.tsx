/**
 * 📄 MDX 功能展示页面
 *
 * 使用通用的 MDXPageLayout 组件来展示 MDX 内容
 */
import { MDXPageLayout } from "@/shared/components/layout/MDXPageLayout";
import ShowcaseContent from "@/shared/content/mdx-showcase.mdx";

// 页面元数据配置
const metadata = {
  title: "MDX 完整功能展示",
  description: "展示 MDX 的各种功能和组件集成",
  author: {
    name: "开发团队",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Developer",
    role: "前端开发工程师",
  },
  coverImage:
    "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&h=630&fit=crop",
  date: "2024-12-08",
  readTime: "15 分钟",
  tags: ["MDX", "React", "TypeScript", "教程"],
};

export default function MDXShowcase() {
  return (
    <MDXPageLayout
      metadata={metadata}
      MDXContent={ShowcaseContent}
      showTOC={true}
      showHeader={true}
      showFooter={true}
    />
  );
}
