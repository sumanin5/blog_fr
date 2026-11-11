import type {
  PostDetailResponse,
  PostType,
} from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";

import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";
import type { ReaderMeta } from "./reader";

/** 把文章详情映射成分段阅读页需要的 URL 与元数据 */
export function readerMetaFromPost(
  post: ApiData<PostDetailResponse>,
  postType: PostType,
  slug: string,
): ReaderMeta {
  const detailPath = routes.postDetailSlug(postType, slug);

  return {
    title: post.title,
    description: post.excerpt,
    published: post.publishedAt,
    updated: post.updatedAt,
    category: post.category?.name,
    tags: post.tags?.map((tag) => tag.name),
    canonicalUrl: absoluteUrl(detailPath),
    markdownUrl: absoluteUrl(`${detailPath}.md`),
    textUrl: absoluteUrl(routes.postText(postType, slug)),
    readerUrl: absoluteUrl(routes.postRead(postType, slug)),
  };
}
