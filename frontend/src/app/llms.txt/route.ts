import { siteConfig } from "@/config/site";
import { getCategories } from "@/lib/categories-api";
import { routes } from "@/lib/routes";
import {
  absoluteUrl,
  getAllPublishedPosts,
  toPlainExcerpt,
  type PublishedPost,
} from "@/lib/seo";
import type { PostType } from "@/shared/api/generated/types.gen";

// 与 sitemap 同频：内容变更依赖 posts-list / categories 标签按需失效
export const revalidate = 300;

const SECTION_TITLE: Record<PostType, string> = {
  articles: "文章",
  ideas: "想法",
};

function markdownUrl(post: PublishedPost) {
  return absoluteUrl(`${routes.postDetailSlug(post.postType, post.slug)}.md`);
}

function postLine(post: PublishedPost) {
  const note = post.excerpt ? `: ${post.excerpt.replace(/\s+/g, " ")}` : "";
  return `- [${post.title}](${markdownUrl(post)})${note}`;
}

/**
 * llms.txt（https://llmstxt.org）：给 LLM 与 AI 工具的站点目录
 *
 * 每篇文章都链接到干净的 Markdown 版本（.md），全文合集见 /llms-full.txt。
 */
export async function GET() {
  const [articles, ideas, categories] = await Promise.all([
    getAllPublishedPosts("articles"),
    getAllPublishedPosts("ideas"),
    getCategories("articles").catch(() => null),
  ]);

  const activeCategories = (categories?.items ?? []).filter(
    (category) => category.isActive !== false,
  );

  const sections = [
    `# ${siteConfig.name}`,
    `> ${siteConfig.description}`,
    [
      `本站内容对 AI 爬虫与工具完全开放。任意文章地址追加 \`.md\` 即可获得 Markdown 原文`,
      `（例如 ${siteConfig.url}/posts/articles/<slug>.md），`,
      `或在请求头中携带 \`Accept: text/markdown\`。`,
    ].join(""),
    `## ${SECTION_TITLE.articles}\n\n${articles.map(postLine).join("\n")}`,
    activeCategories.length
      ? `## 专栏\n\n${activeCategories
          .map(
            (c) =>
              `- [${c.name}](${absoluteUrl(routes.postCategory("articles", c.slug))})` +
              (c.description ? `: ${toPlainExcerpt(c.description, 120)}` : ""),
          )
          .join("\n")}`
      : null,
    ideas.length ? `## ${SECTION_TITLE.ideas}\n\n${ideas.map(postLine).join("\n")}` : null,
    [
      "## Optional",
      "",
      `- [全部文章全文](${absoluteUrl("/llms-full.txt")}): 所有已发布内容的 Markdown 合集`,
      `- [RSS](${absoluteUrl("/rss.xml")})`,
      `- [Sitemap](${absoluteUrl("/sitemap.xml")})`,
    ].join("\n"),
  ].filter(Boolean);

  return new Response(`${sections.join("\n\n")}\n`, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
