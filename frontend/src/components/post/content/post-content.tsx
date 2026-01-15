/**
 * 文章内容渲染入口
 *
 * 职责：根据配置路由到不同的渲染器
 *
 * 三种渲染模式：
 * 1. 后端 HTML → HtmlRenderer
 * 2. MDX 服务端 → MdxServerRenderer
 * 3. MDX 客户端 → MdxClientRenderer
 */

import { HtmlRenderer } from "./renderers/html-renderer";
import { MdxServerRenderer } from "./renderers/mdx-server-renderer";
import { MdxClientRenderer } from "./renderers/mdx-client-renderer";
import { getArticleClassName } from "./post-content-styles";

interface PostContentProps {
  html?: string;
  mdx?: string;
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
  html,
  mdx,
  enableJsx = false,
  useServerRendering = true,
  className = "",
}: PostContentProps) {
  // 统一在入口处理样式
  const articleClassName = getArticleClassName(className);

  // 模式 1：MDX 服务端渲染
  if (enableJsx && useServerRendering && mdx) {
    return <MdxServerRenderer mdx={mdx} articleClassName={articleClassName} />;
  }

  // 模式 2：MDX 客户端渲染
  if (enableJsx && !useServerRendering && mdx) {
    return <MdxClientRenderer mdx={mdx} articleClassName={articleClassName} />;
  }

  // 模式 3：后端 HTML 渲染
  if (html) {
    return <HtmlRenderer html={html} articleClassName={articleClassName} />;
  }

  return <div>无内容</div>;
}
