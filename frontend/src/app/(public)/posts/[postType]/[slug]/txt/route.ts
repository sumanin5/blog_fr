import type { PostType } from "@/shared/api/generated/types.gen";

import { getPublishedPost, renderPostMarkdown } from "@/lib/markdown/export";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 300;

interface RouteContext {
  params: Promise<{ postType: string; slug: string }>;
}

/**
 * 纯文本入口（text/plain）。
 *
 * 有些抓取器不接受 text/markdown 或带 Content-Disposition 的响应，
 * 这里提供同样内容的 .txt 版本；content-type 是最通用的 text/plain。
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { postType, slug } = await params;
  const post = await getPublishedPost(postType, slug);

  if (!post) {
    return new Response("Article not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const body = renderPostMarkdown(post, postType as PostType, slug);
  const canonical = absoluteUrl(routes.postDetailSlug(postType as PostType, slug));
  const reader = absoluteUrl(routes.postRead(postType, slug));

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Length": String(new TextEncoder().encode(body).byteLength),
      "Cache-Control": "public, max-age=60, s-maxage=300",
      "Access-Control-Allow-Origin": "*",
      // canonical 指回 HTML 页；reader 提供分段版本，便于有截断上限的工具
      Link: `<${canonical}>; rel="canonical", <${reader}>; rel="alternate"; type="text/html"`,
    },
  });
}
