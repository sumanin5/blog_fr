import { PostContentServer } from "./post-content-server";
import { PostContentClient } from "./post-content-client";

interface PostContentProps {
  html?: string;
  mdx?: string;
  enableJsx?: boolean;
  className?: string;
}

export function PostContent({
  html,
  mdx,
  enableJsx = false,
  className = "",
}: PostContentProps) {
  // 条件渲染：enable_jsx 决定用服务端还是客户端组件
  if (enableJsx && mdx) {
    // 客户端渲染 MDX（支持交互式 JSX）
    return <PostContentClient mdx={mdx} className={className} />;
  }

  // 服务端渲染 HTML（SEO 友好，支持自定义组件）
  if (!html) {
    return <div>无内容</div>;
  }

  return <PostContentServer html={html} className={className} />;
}
