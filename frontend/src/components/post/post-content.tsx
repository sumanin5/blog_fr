/**
 * 文章内容渲染组件
 *
 * 架构设计（优化后）：
 *   1. enable_jsx: false（默认）→ 渲染后端生成的 HTML（SEO 友好）
 *   2. enable_jsx: true + use_server_rendering: true → 服务端编译 MDX，交互组件在客户端激活
 *   3. enable_jsx: true + use_server_rendering: false → 客户端渲染 MDX（向后兼容）
 *
 * 性能优化：
 *   - 默认使用服务端渲染，避免客户端 MDX 编译的白屏延迟
 *   - 静态内容在服务端渲染为 HTML
 *   - 只有交互组件（如按钮、图表）在客户端激活
 */

import { MDXRemote } from "next-mdx-remote/rsc";
import { PostContentServer } from "./post-content-server";
import { PostContentClient } from "./post-content-client";
import { mdxComponents } from "@/components/mdx/mdx-components";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface PostContentProps {
  html?: string;
  mdx?: string;
  enableJsx?: boolean;
  useServerRendering?: boolean;
  className?: string;
}

/**
 * 统一的文章内容渲染入口
 * 根据 enableJsx 和 useServerRendering 字段选择渲染策略
 */
export async function PostContent({
  html,
  mdx,
  enableJsx = false,
  useServerRendering = true,
  className = "",
}: PostContentProps) {
  const articleClassName = `
    prose prose-lg dark:prose-invert max-w-none
    prose-headings:scroll-mt-20
    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
    prose-code:before:content-none prose-code:after:content-none
    prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5
    prose-img:rounded-lg prose-img:shadow-md
    ${className}
  `;

  // 模式 1：交互式 MDX + 服务端渲染（推荐）
  if (enableJsx && useServerRendering && mdx) {
    return (
      <article className={articleClassName}>
        <MDXRemote
          source={mdx}
          components={mdxComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm, remarkMath],
              rehypePlugins: [rehypeKatex as any],
            },
          }}
        />
      </article>
    );
  }

  // 模式 2：交互式 MDX + 客户端渲染（向后兼容）
  if (enableJsx && !useServerRendering && mdx) {
    return <PostContentClient mdx={mdx} className={className} />;
  }

  // 模式 3：纯 HTML 渲染（后端预处理）
  if (!html) {
    return <div>无内容</div>;
  }

  return <PostContentServer html={html} className={className} />;
}
