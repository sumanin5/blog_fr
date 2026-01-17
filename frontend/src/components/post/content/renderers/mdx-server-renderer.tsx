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

/**
 * 将 HTML style 字符串转换为 JSX 对象格式
 */
function convertHtmlStyleToJsx(mdx: string): string {
  return mdx.replace(/style="([^"]*)"/g, (match, styleStr) => {
    // 将 CSS 字符串转换为 JSX 对象格式
    const styles = styleStr
      .split(";")
      .filter((s: string) => s.trim())
      .map((s: string) => {
        const [key, value] = s.split(":").map((p: string) => p.trim());
        if (!key || !value) return "";
        // 转换 kebab-case 为 camelCase
        const camelKey = key.replace(/-([a-z])/g, (g: string) =>
          g[1].toUpperCase()
        );
        return `${camelKey}: '${value}'`;
      })
      .filter(Boolean)
      .join(", ");

    return `style={{ ${styles} }}`;
  });
}

export async function MdxServerRenderer({
  mdx,
  toc,
  articleClassName,
}: MdxServerRendererProps) {
  // 预处理：转换 HTML style 为 JSX 格式
  const processedMdx = convertHtmlStyleToJsx(mdx);

  return (
    <article className={articleClassName}>
      <MDXRemote
        source={processedMdx}
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
