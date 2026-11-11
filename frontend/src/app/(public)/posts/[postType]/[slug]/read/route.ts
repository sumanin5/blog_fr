import type { PostType } from "@/shared/api/generated/types.gen";

import { getPublishedPost } from "@/lib/markdown/export";
import {
  readerResponse,
  renderReaderIndexHtml,
  renderReaderPartHtml,
  splitMarkdownParts,
} from "@/lib/markdown/reader";
import { readerMetaFromPost } from "@/lib/markdown/reader-meta";

export const revalidate = 300;

interface RouteContext {
  params: Promise<{ postType: string; slug: string }>;
}

/**
 * 分段阅读（纯内容 HTML）。
 *
 * /read            → 分段目录
 * /read?part=2     → 第 2 段正文
 *
 * /read/2 由 next.config.ts 的 rewrite 映射到 /read?part=2。
 * 这样既保留短地址，也避开 Turbopack 下嵌套动态 route handler 不注册的问题。
 */
export async function GET(request: Request, { params }: RouteContext) {
  const { postType, slug } = await params;
  const url = new URL(request.url);
  // 直接访问 /read?part=2，或经 rewrite 访问 /read/2 时，Next 可能保留原始路径
  const partParam =
    url.searchParams.get("part") ??
    /\/read\/([^/]+)\/?$/.exec(url.pathname)?.[1] ??
    null;

  if (partParam !== null) {
    const index = Number(partParam);
    if (!Number.isInteger(index) || index < 1) {
      return readerResponse("Invalid part", 404, "text/plain; charset=utf-8");
    }
  }

  const post = await getPublishedPost(postType, slug);
  if (!post) {
    return readerResponse("Article not found", 404, "text/plain; charset=utf-8");
  }

  const parts = splitMarkdownParts(post.contentMdx ?? "");
  if (parts.length === 0) {
    return readerResponse(
      "Article has no readable content",
      404,
      "text/plain; charset=utf-8",
    );
  }

  const meta = readerMetaFromPost(post, postType as PostType, slug);

  if (partParam === null) {
    return readerResponse(renderReaderIndexHtml(meta, parts));
  }

  const current = parts[Number(partParam) - 1];
  if (!current) {
    return readerResponse(
      `Part ${partParam} not found; this article has ${parts.length} parts`,
      404,
      "text/plain; charset=utf-8",
    );
  }

  return readerResponse(renderReaderPartHtml(meta, parts, current));
}
