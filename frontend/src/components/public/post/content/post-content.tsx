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

import { AstRenderer } from "./renderers/ast-renderer";
import { MdxServerRenderer } from "./renderers/mdx-server-renderer";
import { MdxClientRenderer } from "./renderers/mdx-client-renderer";
import { getArticleClassName } from "./post-content-styles";

interface PostContentProps {
  mdx?: string;
  ast?: Record<string, unknown> | null;
  toc?: Array<{ id: string; title: string; level: number }>;
  enableJsx?: boolean;
  useServerRendering?: boolean;
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
  className = "",
}: PostContentProps) {
  const articleClassName = getArticleClassName(className);

  // 优先级 1：AST 渲染（最快，适合 99% 的文章）
  if (ast && !enableJsx) {
    return <AstRenderer ast={ast} articleClassName={articleClassName} />;
  }

  // 优先级 2：显式要求客户端渲染
  if (enableJsx && !useServerRendering && mdx) {
    return (
      <MdxClientRenderer
        mdx={mdx}
        toc={toc}
        articleClassName={articleClassName}
      />
    );
  }

  // 优先级 3：MDX 服务端渲染（只要有 mdx 内容，均支持完整服务端直出）
  if (mdx) {
    return (
      <MdxServerRenderer
        mdx={mdx}
        toc={toc}
        articleClassName={articleClassName}
      />
    );
  }

  return (
    <div className="py-8 text-center text-muted-foreground">暂无正文内容</div>
  );
}
