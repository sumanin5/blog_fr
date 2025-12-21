import { MDXProvider } from "@/shared/components/mdx";
import ExampleContent from "@/content/example.mdx";

/**
 * 📄 MDX 示例页面
 *
 * 展示如何在页面中使用 MDX 内容
 */
export default function MDXExample() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* MDX Provider 提供自定义组件样式 */}
      <MDXProvider>
        {/* 渲染 MDX 内容 */}
        <article className="prose max-w-none">
          <ExampleContent />
        </article>
      </MDXProvider>
    </div>
  );
}
