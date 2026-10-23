import "server-only";

import type { MarkdownDocument, MarkdownHeading } from "@tanstack/markdown";
import { docsMarkdownExtensions } from "@tanstack/markdown/extensions/docs";
import { parseMarkdown } from "@tanstack/markdown/parser";

export interface ArticleHeading {
  id: string;
  title: string;
  level: number;
}

export interface ParsedArticleMarkdown {
  document: MarkdownDocument;
  headings: ArticleHeading[];
}

export interface ParseArticleOptions {
  /**
   * 文章详情页已经有页面级 h1，正文开头的 h1 通常只是重复标题。
   * 默认保留，详情页显式开启去除。
   */
  stripLeadingHeading?: boolean;
}

const articleExtensions = docsMarkdownExtensions();

/**
 * TanStack Markdown 是默认的文章渲染链路。
 *
 * 它负责：
 * - 稳定的 heading id
 * - 文档型 callout
 * - 标题收集（右侧目录）
 * - 表格、脚注、任务列表、代码围栏
 *
 * MDX / JSX 与数学公式仍走原来的 MDX 渲染器，避免破坏已有内容。
 */
export function parseArticleMarkdown(
  source: string,
  options: ParseArticleOptions = {},
): ParsedArticleMarkdown {
  const parsed = parseMarkdown(source, {
    extensions: articleExtensions,
    allowHtml: true,
  });

  const firstChild = parsed.children[0];
  const shouldStrip =
    options.stripLeadingHeading &&
    firstChild?.type === "heading" &&
    firstChild.depth === 1;

  const document: MarkdownDocument = shouldStrip
    ? { ...parsed, children: parsed.children.slice(1) }
    : parsed;

  const removedHeadingId =
    firstChild?.type === "heading" ? firstChild.id : undefined;

  const headings = (document.headings ?? []).filter(
    (heading) => !shouldStrip || heading.id !== removedHeadingId,
  );

  return {
    document,
    headings: normalizeHeadings(headings),
  };
}

export function normalizeHeadings(headings: MarkdownHeading[]): ArticleHeading[] {
  return headings.map((heading) => ({
    id: heading.id,
    title: heading.text,
    level: heading.level,
  }));
}

/**
 * 判断正文是否需要保留 MDX 渲染器。
 *
 * 当前 TanStack Markdown 的语法契约不包含 MDX/JSX 与 TeX 数学公式，
 * 因此只在这些明确的兼容场景下回退，而不是继续默认走旧 AST。
 */
export function requiresMdxRenderer(
  source: string,
  options: { enableJsx?: boolean | null } = {},
): boolean {
  if (options.enableJsx) return true;
  return containsMathSyntax(source);
}

/**
 * 去掉代码围栏与行内代码后再检测数学公式，避免把 shell 的 `$VAR`
 * 或正文里的美元符号误判为公式。
 */
export function containsMathSyntax(source: string): boolean {
  const withoutFencedCode = source.replace(/```[\s\S]*?```/g, "");
  const withoutInlineCode = withoutFencedCode.replace(/`[^`\n]*`/g, "");

  return (
    /\$\$[\s\S]+?\$\$/.test(withoutInlineCode) ||
    /(^|[^\\$])\$[^$\n]+?\$/.test(withoutInlineCode)
  );
}
