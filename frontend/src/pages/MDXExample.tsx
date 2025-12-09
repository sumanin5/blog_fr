import { MDXProvider } from "@/components/mdx";
import ExampleContent from "@/content/example.mdx";

/**
 * 📄 MDX 示例页面
 *
 * 展示如何在页面中使用 MDX 内容
 */
export default function MDXExample() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* MDX Provider 提供自定义组件样式 */}
      <MDXProvider>
        {/* 渲染 MDX 内容 */}
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <ExampleContent />
        </article>
      </MDXProvider>
    </div>
  );
}
