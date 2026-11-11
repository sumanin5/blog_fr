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

  const body = renderPostMarkdown(post, postType as PostType, slug);
  const canonical = absoluteUrl(routes.postDetailSlug(postType as PostType, slug));
  const reader = absoluteUrl(routes.postRead(postType, slug));
  const plainText = absoluteUrl(routes.postText(postType, slug));

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // 显式长度，避免部分抓取器对 chunked 响应报错
      "Content-Length": String(new TextEncoder().encode(body).byteLength),
      "Cache-Control": "public, max-age=60, s-maxage=300",
      "Access-Control-Allow-Origin": "*",
      // 同一文章 URL 可能因 Accept: text/markdown 返回 Markdown，缓存必须区分
      Vary: "Accept",
      // 允许任何爬虫抓取与收录；canonical 指回 HTML 页，避免被搜索引擎视为重复内容
      Link: `<${canonical}>; rel="canonical", <${plainText}>; rel="alternate"; type="text/plain", <${reader}>; rel="alternate"; type="text/html"`,
    },
  });
}
