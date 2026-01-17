import { MDXRemote } from "next-mdx-remote/rsc";
import { createMdxComponents } from "@/components/mdx/registry/mdx-components";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
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
  return (
    <article className={articleClassName}>
      <MDXRemote
        source={mdx}
        components={createMdxComponents(toc)}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm, remarkMath],
            rehypePlugins: [rehypeKatex],
          },
        }}
      />
    </article>
  );
}
