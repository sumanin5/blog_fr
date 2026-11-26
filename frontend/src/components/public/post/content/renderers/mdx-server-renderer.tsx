import { MDXRemote } from "next-mdx-remote/rsc";
import { createMdxComponents } from "@/components/public/mdx/registry/mdx-components";
import { createMdxCompileOptions } from "@/lib/markdown/mdx-options";
import { prepareMdxSource } from "@/lib/markdown/mdx-preprocess";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";

/**
 * MDX 服务端渲染器
 *
 * 职责：在 Next.js 服务器上编译 MDX 并渲染为 React 元素
 *
 * 特点：
 * - 在服务器执行，性能好
 * - SEO 友好
 * - 支持自定义 MDX 组件
 * - 支持交互组件（客户端激活）
 */

interface MdxServerRendererProps {
  mdx: string;
  toc: Array<{ id: string; title: string; level: number }>;
  articleClassName: string;
}

export async function MdxServerRenderer({
  mdx,
  toc,
  articleClassName,
}: MdxServerRendererProps) {
  // 预处理：去掉重复的正文 H1，并转换 HTML style 为 JSX 格式
  const processedMdx = prepareMdxSource(mdx);

  return (
    <article className={cn(articleClassName, "markdown-body")}>
      <MDXRemote
        source={processedMdx}
        components={createMdxComponents(toc)}
        options={createMdxCompileOptions()}
      />
    </article>
  );
}
