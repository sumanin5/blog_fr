/**
 * 🧪 MDX 清理测试页面
 *
 * 使用通用的 MDXPageLayout 组件来展示测试内容
 */
import { MDXPageLayout } from "@/components/layout/MDXPageLayout";
import TestContent from "@/content/test-clean.mdx";

// 测试页面元数据配置
const metadata = {
  title: "MDX 清理测试",
  description: "测试 MDX 渲染功能和组件映射的清理版本",
  author: {
    name: "测试团队",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tester",
    role: "QA 工程师",
  },
  date: "2024-12-11",
  readTime: "5 分钟",
  tags: ["测试", "MDX", "验证"],
};

export default function MDXTestClean() {
  return (
    <MDXPageLayout
      metadata={metadata}
      MDXContent={TestContent}
      showTOC={true}
      showHeader={true}
      showFooter={true}
    />
  );
}
