import { stripLeadingMarkdownHeading } from "./leading-heading";

const FRONTMATTER_BLOCK_RE = /^\uFEFF?---[\s\S]*?---\s*/;
const FENCE_RE = /^\s*(```|~~~)/;
const JSX_TAG_RE = /<\s*([A-Z][A-Za-z0-9_]*)\b/g;

/**
 * 移除文章头部的 YAML Frontmatter 块。
 */
export function stripMdxFrontmatter(source: string): string {
  return source.replace(FRONTMATTER_BLOCK_RE, "");
}

/**
 * 统计字符串行数（用于预检告警行号回推至原文件位置）。
 */
export function countRemovedLeadingLines(
  before: string,
  after: string,
): number {
  if (!before.endsWith(after)) {
    return Math.max(0, before.split(/\r?\n/).length - after.split(/\r?\n/).length);
  }
  const removed = before.slice(0, before.length - after.length);
  return (removed.match(/\n/g) ?? []).length;
}

/**
 * 统一规范化 MDX 源码：去掉重复的正文 H1，并将内联 HTML style="..." 转换为 JSX style={{ ... }}。
 */
export function prepareMdxSource(mdx: string): string {
  return convertHtmlStyleToJsx(stripLeadingMarkdownHeading(mdx));
}

/**
 * 将 HTML 内联 style="..." 字符串转换为 JSX style={{ ... }} 对象。
 */
export function convertHtmlStyleToJsx(mdx: string): string {
  return mdx.replace(/style="([^"]*)"/g, (_match, styleStr: string) => {
    const styles = styleStr
      .split(";")
      .filter((s: string) => s.trim())
      .map((s: string) => {
        const [key, value] = s.split(":").map((p: string) => p.trim());
        if (!key || !value) return "";
        const camelKey = key.replace(/-([a-z])/g, (g: string) =>
          g[1].toUpperCase(),
        );
        return `${camelKey}: '${value}'`;
      })
      .filter(Boolean)
      .join(", ");

    return `style={{ ${styles} }}`;
  });
}

/**
 * 扫描围栏代码块与行内反引号之外的大写 JSX 组件，返回未在白名单注册表内声明的标签。
 */
export function findUnregisteredJsxTags(
  mdxBody: string,
  registeredNames: Set<string>,
): string[] {
  if (registeredNames.size === 0) return [];

  const unknown: string[] = [];
  const seen = new Set<string>();
  let inFence = false;

  for (const line of mdxBody.split(/\r?\n/)) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const cleaned = line.replace(/`[^`]*`/g, "");
    JSX_TAG_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = JSX_TAG_RE.exec(cleaned)) !== null) {
      const tag = match[1];
      if (!registeredNames.has(tag) && !seen.has(tag)) {
        seen.add(tag);
        unknown.push(tag);
      }
    }
  }

  return unknown;
}
