"use client";

import React from "react";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import { createMdxComponents } from "@/components/public/mdx/registry/mdx-components";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import "katex/dist/katex.min.css";

/**
 * MDX 客户端渲染器
 *
 * 职责：在浏览器中编译 MDX 并渲染为 React 元素
 *
 * 适用场景：
 * - 预览页面（需要实时编译）
 * - 在客户端组件中使用
 * - 不需要 SEO 的页面
 *
 * 注意：性能较差，优先使用服务端渲染
 */

interface MdxClientRendererProps {
  mdx: string;
  toc: Array<{ id: string; title: string; level: number }>;
  articleClassName: string;
}

export function MdxClientRenderer({
  mdx,
  toc,
  articleClassName,
}: MdxClientRendererProps) {
  const [mdxSource, setMdxSource] = React.useState<
    import("next-mdx-remote").MDXRemoteSerializeResult | null
  >(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    console.log("MDX 内容预览:", mdx.substring(0, 500));

    // 预处理：将 HTML style 属性转换为 JSX 格式
    const processedMdx = mdx.replace(/style="([^"]*)"/g, (match, styleStr) => {
      // 将 CSS 字符串转换为 JSX 对象格式
      const styles = styleStr
        .split(";")
        .filter((s: string) => s.trim())
        .map((s: string) => {
          const [key, value] = s.split(":").map((p: string) => p.trim());
          if (!key || !value) return "";
          // 转换 kebab-case 为 camelCase
          const camelKey = key.replace(/-([a-z])/g, (g: string) =>
            g[1].toUpperCase(),
          );
          return `${camelKey}: '${value}'`;
        })
        .filter(Boolean)
        .join(", ");

      return `style={{ ${styles} }}`;
    });

    console.log("处理后的 MDX:", processedMdx.substring(0, 500));

    serialize(processedMdx, {
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [rehypeKatex],
      },
    })
      .then(setMdxSource)
      .catch((err) => {
        console.error("MDX serialization error:", err);
        setError(err.message);
      });
  }, [mdx]);

  if (error) {
    return (
      <article className={articleClassName}>
        <div className="p-4 bg-destructive/10 border border-destructive rounded">
          <p className="text-destructive font-mono text-sm">
            MDX 渲染错误: {error}
          </p>
        </div>
      </article>
    );
  }

  if (!mdxSource) {
    return (
      <article className={articleClassName}>
        <div className="animate-pulse bg-muted h-20 rounded" />
      </article>
    );
  }

  return (
    <article className={articleClassName}>
      <MDXRemote {...mdxSource} components={createMdxComponents(toc)} />
    </article>
  );
}
