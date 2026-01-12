"use client";

import React from "react";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import { createMdxComponents } from "@/components/mdx/mdx-components";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import "katex/dist/katex.min.css";

/**
 * 客户端 MDX 渲染组件
 *
 * 适用场景：
 *   - 预览页面（需要实时编译）
 *   - 在客户端组件中使用
 *
 * 注意：对于文章详情页，请使用 PostContent（服务端版本）以获得更好的性能
 */

interface PostContentClientProps {
  mdx: string;
  className?: string;
}

export function PostContentClient({
  mdx,
  className = "",
}: PostContentClientProps) {
  const [mdxSource, setMdxSource] = React.useState<
    import("next-mdx-remote").MDXRemoteSerializeResult | null
  >(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    serialize(mdx, {
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

  const articleClassName = `
    prose prose-lg dark:prose-invert max-w-none
    prose-headings:scroll-mt-20
    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
    prose-code:before:content-none prose-code:after:content-none
    prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5
    prose-img:rounded-lg prose-img:shadow-md
    ${className}
  `;

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
      <MDXRemote {...mdxSource} components={createMdxComponents()} />
    </article>
  );
}
