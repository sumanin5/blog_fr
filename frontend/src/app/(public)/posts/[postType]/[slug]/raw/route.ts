import { getPublishedPost, renderPostMarkdown } from "@/lib/markdown/export";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";
import type { PostType } from "@/shared/api/generated/types.gen";

interface RouteContext {
  params: Promise<{
    postType: string;
    slug: string;
  }>;
}

/**
 * 纯 Markdown 源文入口。
 *
 * 对应 TanStack / ACP 文档站的 “View as Markdown”：
 * 浏览器直接拿到 text/markdown，而不是被 React 包装后的 HTML。
 * 同时通过 /posts/:type/:slug.md 与 `Accept: text/markdown` 访问（见 next.config.ts）。
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { postType, slug } = await params;

  // 纯文本入口没有登录态，只暴露已发布内容，避免草稿通过 slug 泄漏。
  const post = await getPublishedPost(postType, slug);
  if (!post) {
    return new Response("Markdown source unavailable", { status: 404 });
  }

  const filename = slug.replace(/["\r\n]/g, "");
  const canonical = absoluteUrl(routes.postDetailSlug(postType as PostType, slug));

  return new Response(renderPostMarkdown(post, postType as PostType, slug), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}.md"`,
      "Cache-Control": "public, max-age=60, s-maxage=300",
      // 允许任何爬虫抓取与收录；canonical 指回 HTML 页，避免被搜索引擎视为重复内容
      Link: `<${canonical}>; rel="canonical"`,
    },
  });
}
