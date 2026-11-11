/**
 * SEO 公共工具：站点绝对地址、全量文章枚举、纯文本摘要
 *
 * sitemap.xml / rss.xml / 文章 metadata 共用，保证三者输出的 URL 与摘要一致。
 */

import { siteConfig } from "@/config/site";
import { getPosts } from "@/lib/post-api";
import type { PostShortResponse, PostType } from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";

export const POST_TYPES: PostType[] = ["articles", "ideas"];

// 后端分页上限为 100（fastapi-pagination Params）
const MAX_PAGE_SIZE = 100;

export function absoluteUrl(path = "/"): string {
  return new URL(path, siteConfig.url).toString();
}

export type PublishedPost = ApiData<PostShortResponse> & {
  slug: string;
  postType: PostType;
};

/** 翻页拉取某板块全部已发布文章；后端不可用时返回空数组，避免构建或抓取失败 */
export async function getAllPublishedPosts(
  postType: PostType,
): Promise<PublishedPost[]> {
  const posts: ApiData<PostShortResponse>[] = [];
  try {
    for (let page = 1; ; page++) {
      const res = await getPosts(postType, page, MAX_PAGE_SIZE);
      posts.push(...(res.items ?? []));
      if (page >= (res.pages ?? 1)) break;
    }
  } catch (error) {
    console.warn(`[seo] Failed to list ${postType}:`, error);
  }
  return posts
    .filter((post) => post.status === "published" && post.slug)
    .map((post) => ({ ...post, slug: post.slug as string, postType }));
}

/** 去掉 Markdown/MDX 语法后截断，用于 description 与 RSS 摘要 */
export function toPlainExcerpt(markdown: string, maxLength = 150): string {
  const text = markdown
    .replace(/^---[\s\S]*?---/, "") // frontmatter
    .replace(/```[\s\S]*?```/g, " ") // 代码块
    .replace(/<[^>]+>/g, " ") // HTML / JSX 标签
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接保留文字
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "") // 标题、引用、列表标记
    .replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/gi, "") // GitHub 风格提示块标记
    .replace(/[`*_~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

/** 按句号/问号/感叹号截断，避免领域简介停在半句话中间 */
function truncateAtSentence(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const slice = text.slice(0, maxLength);
  const sentenceEnd = Math.max(
    slice.lastIndexOf("。"),
    slice.lastIndexOf("！"),
    slice.lastIndexOf("？"),
    slice.lastIndexOf("；"),
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
  );

  if (sentenceEnd >= Math.floor(maxLength * 0.4)) {
    let end = sentenceEnd + 1;
    // 句号可能包在括号/引号里，补上紧跟的收尾符号
    while (end < text.length && /[)”"’\]】）]/.test(text[end])) end++;
    return text.slice(0, end).trim();
  }

  const commaEnd = Math.max(
    slice.lastIndexOf("，"),
    slice.lastIndexOf("、"),
    slice.lastIndexOf(", "),
  );
  if (commaEnd >= Math.floor(maxLength * 0.6)) {
    return `${slice.slice(0, commaEnd).trim()}…`;
  }

  return `${slice.trimEnd()}…`;
}

/** 从分类 description 中挑第一段真正的正文，跳过标题、引用、代码、表格和列表 */
function firstProseBlock(markdown: string): string {
  const body = markdown.replace(/^---[\s\S]*?---/, "").trim();

  for (const block of body.split(/\n{2,}/)) {
    const text = block.trim();
    if (!text) continue;
    if (/^(#{1,6}\s|>\s|!\[|```|~~~|\||-{3,}|\*\s|-\s|\d+\.\s|<)/.test(text)) {
      continue;
    }

    const plain = toPlainExcerpt(text, 400).replace(/…$/, "").trim();
    if (plain.length >= 20) return text;
  }

  return "";
}

/** 分类页常用一句引用作为领域钩子；没有 excerpt 时优先用它 */
function firstBlockquote(markdown: string): string {
  const body = markdown.replace(/^---[\s\S]*?---/, "").trim();

  for (const block of body.split(/\n{2,}/)) {
    const lines = block
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    if (lines.length === 0 || !lines.every((line) => /^\s*>/.test(line))) {
      continue;
    }

    const text = lines
      .map((line) => line.replace(/^\s*>\s?/, ""))
      .join(" ")
      .trim();
    if (toPlainExcerpt(text, 400).replace(/…$/, "").trim().length >= 15) {
      return text;
    }
  }

  return "";
}

/**
 * 生成领域卡片的纯文本简介。
 *
 * 优先使用分类的 excerpt；没有 excerpt 时，优先取 description 的第一段引用
 * 作为领域钩子，否则跳过标题/列表取第一段正文，避免把 Markdown 标记直接显示出来。
 */
export function toDomainExcerpt(
  input: {
    name?: string | null;
    excerpt?: string | null;
    description?: string | null;
  },
  maxLength = 100,
): string {
  const name = input.name?.trim();
  const candidate = input.excerpt?.trim()
    ? input.excerpt
    : firstBlockquote(input.description || "") ||
      firstProseBlock(input.description || "");

  if (!candidate) return "";

  let text = toPlainExcerpt(candidate, maxLength * 3)
    .replace(/…$/, "")
    .replace(/^(?:📖\s*)?简介[：:]\s*/, "")
    .replace(/^关于这个栏目[：:]?\s*/, "")
    .trim();

  // 去掉开头的 emoji / Markdown 符号，但保留引号和书名号
  text = text.replace(/^[^\p{L}\p{N}"“”'‘’《【]+/u, "").trim();

  if (name && text.startsWith(name)) {
    text = text
      .slice(name.length)
      .replace(/^[：:，,。.\s]+/, "")
      .trim();
  }

  return text ? truncateAtSentence(text, maxLength) : "";
}
