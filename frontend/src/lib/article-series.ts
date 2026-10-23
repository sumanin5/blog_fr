import type { PostShortResponse, PostType } from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";
import { routes } from "@/lib/routes";

function publishedTime(post: ApiData<PostShortResponse>) {
  const value = post.publishedAt || post.createdAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

/**
 * 专栏文章按发布时间正序排列，形成稳定的 01、02、03 阅读顺序。
 * 没有发布时间的条目保持原始 API 顺序。
 */
export function sortSeriesPosts(
  posts: ApiData<PostShortResponse>[],
): ApiData<PostShortResponse>[] {
  return [...posts].sort((a, b) => publishedTime(a) - publishedTime(b));
}

export function getSeriesNeighbors(
  posts: ApiData<PostShortResponse>[],
  currentSlug?: string | null,
) {
  if (!currentSlug) return { previous: undefined, next: undefined };

  const index = posts.findIndex(
    (post) => post.slug === currentSlug || post.id === currentSlug,
  );

  return {
    previous: index > 0 ? posts[index - 1] : undefined,
    next: index >= 0 && index < posts.length - 1 ? posts[index + 1] : undefined,
  };
}

export function getPostHref(
  postType: PostType | string,
  post: ApiData<PostShortResponse>,
) {
  return routes.postDetailSlug(
    postType as PostType,
    post.slug || post.id,
  );
}
