/**
 * 文章内容渲染入口
 *
 * 职责：根据配置路由到不同的渲染器
 *
 * 三种渲染模式（优先级从高到低）：
 * 1. AST 渲染 → AstRenderer（最快，适合 99% 的文章）
 * 2. MDX 服务端 → MdxServerRenderer（最灵活，支持任意 JSX）
 * 3. MDX 客户端 → MdxClientRenderer（灵活但慢）
 */

import type { MarkdownDocument } from "@tanstack/markdown";

import { AstRenderer } from "./renderers/ast-renderer";
import { TanStackMarkdownRenderer } from "./renderers/tanstack-markdown-renderer";
import { getArticleClassName } from "./post-content-styles";

interface PostContentProps {
  mdx?: string;
  ast?: Record<string, unknown> | null;
  toc?: Array<{ id: string; title: string; level: number }>;
  enableJsx?: boolean;
  useServerRendering?: boolean;
  /**
   * 由页面层预解析的 TanStack Markdown 文档。
   * 传入后优先使用它，避免正文与目录重复解析。
   */
  tanstackDocument?: MarkdownDocument | null;
  className?: string;
}

/**
 * 统一的文章内容渲染入口
 *
 * 只做路由判断，不包含渲染逻辑
 */
export async function PostContent({
  mdx,
  ast,
  toc = [],
  enableJsx = false,
  useServerRendering = true,
  tanstackDocument,
  className = "",
}: PostContentProps) {
  const articleClassName = getArticleClassName(className);

  // 优先级 1：TanStack Markdown（默认文章链路，服务端直出）
  if (tanstackDocument) {
    return (
      <TanStackMarkdownRenderer
        document={tanstackDocument}
        articleClassName={articleClassName}
      />
    );
  }

  // 优先级 2：显式要求客户端渲染的 MDX
  if (enableJsx && !useServerRendering && mdx) {
    const { MdxClientRenderer } = await import(
      "./renderers/mdx-client-renderer"
    );

    return (
      <MdxClientRenderer
        mdx={mdx}
        toc={toc}
        articleClassName={articleClassName}
      />
    );
  }

  // 优先级 3：MDX 服务端渲染（JSX、数学公式等兼容场景）
  if (mdx) {
    // 动态加载 MDX 编译链路，避免普通 Markdown 文章首屏编译
    // next-mdx-remote、KaTeX 和 MDX 自定义组件。
    const { MdxServerRenderer } = await import(
      "./renderers/mdx-server-renderer"
    );

    return (
      <MdxServerRenderer
        mdx={mdx}
        toc={toc}
        articleClassName={articleClassName}
      />
    );
  }

  // 优先级 4：后端 AST（仅在没有 source 时兜底）
  if (ast && !enableJsx) {
    return <AstRenderer ast={ast} articleClassName={articleClassName} />;
  }

  return (
    <div className="py-8 text-center text-muted-foreground">暂无正文内容</div>
  );
}
