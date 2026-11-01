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
    .replace(/[`*_~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}
