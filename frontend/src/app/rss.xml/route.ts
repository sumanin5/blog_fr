import { siteConfig } from "@/config/site";
import { routes } from "@/lib/routes";
import { POST_TYPES, absoluteUrl, getAllPublishedPosts } from "@/lib/seo";

// 与 sitemap 同频：内容变更依赖 posts-list 标签按需失效，兜底每 5 分钟重建
export const revalidate = 300;

const FEED_SIZE = 50;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = (await Promise.all(POST_TYPES.map(getAllPublishedPosts)))
    .flat()
    .sort(
      (a, b) =>
        Date.parse(b.publishedAt || b.createdAt) - Date.parse(a.publishedAt || a.createdAt),
    )
    .slice(0, FEED_SIZE);

  const items = posts
    .map((post) => {
      const url = absoluteUrl(routes.postDetailSlug(post.postType, post.slug));
      const categories = (post.tags ?? [])
        .map((tag) => `<category>${escapeXml(tag.name)}</category>`)
        .join("");
      return `<item>
<title>${escapeXml(post.title)}</title>
<link>${url}</link>
<guid isPermaLink="true">${url}</guid>
<pubDate>${new Date(post.publishedAt || post.createdAt).toUTCString()}</pubDate>
${post.excerpt ? `<description>${escapeXml(post.excerpt)}</description>` : ""}
${categories}
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeXml(siteConfig.name)}</title>
<link>${absoluteUrl("/")}</link>
<description>${escapeXml(siteConfig.description)}</description>
<language>zh-CN</language>
<atom:link href="${absoluteUrl("/rss.xml")}" rel="self" type="application/rss+xml"/>
${posts[0] ? `<lastBuildDate>${new Date(posts[0].publishedAt || posts[0].createdAt).toUTCString()}</lastBuildDate>` : ""}
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
