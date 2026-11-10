/**
 * 去掉正文开头的 Markdown H1。
 *
 * 文章详情页、分类页和管理端预览都已经有页面级标题，
 * 正文再渲染一次 `# 标题` 会造成重复的大标题。
 *
 * 只在第一行就是 ATX H1 时处理，避免误伤代码块或其他内容。
 */
export function stripLeadingMarkdownHeading(source: string): string {
  const match = source.match(/^\uFEFF?\s*#\s+[^\n]*(?:\r?\n|$)/);
  if (!match) return source;

  return source.slice(match[0].length).replace(/^\s*\n/, "");
}
