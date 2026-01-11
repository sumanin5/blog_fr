"use client";

import React from "react";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import { MermaidDiagram } from "@/components/mdx/mermaid-diagram";
import { CodeBlock } from "@/components/mdx/code-block";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import "katex/dist/katex.min.css";

const mdxComponents = {
  pre: (props: any) => {
    const children = props.children;
    if (children?.type === "code") {
      const code = children.props.children;
      const className = children.props.className || "";
      const lang = className.replace("language-", "");

      if (lang === "mermaid") {
        return <MermaidDiagram code={code} />;
      }

      return <CodeBlock code={code} className={className} />;
    }
    return <pre {...props} />;
  },
};

interface PostContentClientProps {
  mdx: string;
  className?: string;
}

export function PostContentClient({
  mdx,
  className = "",
}: PostContentClientProps) {
  const [mdxSource, setMdxSource] = React.useState<any>(null);
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
      <MDXRemote {...mdxSource} components={mdxComponents} />
    </article>
  );
}
