/**
 * 文章内容样式配置
 *
 * 统一管理所有渲染模式的样式，避免重复定义
 */

/**
 * 文章内容的基础样式类名
 *
 * 使用 Tailwind Typography 插件提供的 prose 类
 * 适用于所有渲染模式（HTML/RSC/客户端）
 */
export const ARTICLE_BASE_CLASSNAME = `
  prose prose-lg dark:prose-invert max-w-none
  prose-headings:scroll-mt-20
  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
  prose-code:before:content-none prose-code:after:content-none
  prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5
  prose-img:rounded-lg prose-img:shadow-md
`.trim();

/**
 * 获取文章内容的完整样式类名
 *
 * @param customClassName - 可选的自定义类名
 * @returns 合并后的完整类名
 */
export function getArticleClassName(customClassName?: string): string {
  if (!customClassName) {
    return ARTICLE_BASE_CLASSNAME;
  }
  return `${ARTICLE_BASE_CLASSNAME} ${customClassName}`;
}
