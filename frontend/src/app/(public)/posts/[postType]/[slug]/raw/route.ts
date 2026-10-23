import { getPostBySlug } from "@/shared/api/generated/sdk.gen";
import type { PostType } from "@/shared/api/generated/types.gen";
import { normalizeApiResponse } from "@/shared/api/transformers";
import { createServerFetch, serverClient } from "@/lib/server-api-client";

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
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { postType, slug } = await params;

  const { data, error } = await getPostBySlug({
    client: serverClient,
    path: {
      post_type: postType as PostType,
      slug,
    },
    fetch: createServerFetch({ tags: ["posts", `post-${slug}`] }),
  });

  if (error || !data) {
    return new Response("Not found", { status: 404 });
  }

  const post = normalizeApiResponse(data);

  // 纯文本入口没有登录态，只暴露已发布内容，避免草稿通过 slug 泄漏。
  if (post.status !== "published" || !post.contentMdx) {
    return new Response("Markdown source unavailable", { status: 404 });
  }

  const filename = (post.slug || slug).replace(/["\r\n]/g, "");

  return new Response(post.contentMdx, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}.md"`,
      "Cache-Control": "public, max-age=60, s-maxage=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
