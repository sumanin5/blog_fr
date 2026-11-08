import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostCard } from "./post-card";
import { PostDetailView } from "./post-detail-view";
import { generateMetadata } from "@/app/(public)/posts/[postType]/[slug]/page";
import { getPostDetail } from "@/lib/post-api";
import type { PostDetailResponse } from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";

vi.mock("@/lib/post-api", () => ({ getPostDetail: vi.fn() }));
vi.mock("@/components/public/post/content/post-content", () => ({
  PostContent: () => null,
}));
vi.mock("@/components/admin/analytics/ArticleTracker", () => ({
  ArticleTracker: () => null,
}));
vi.mock("@/components/public/mdx/utils/table-of-contents", () => ({
  TableOfContents: () => null,
}));

const base = {
  id: "article-id",
  title: "An independent article cover",
  slug: "article-cover",
  postType: "articles",
  excerpt: "An article with an optional cover.",
  createdAt: "2026-11-09T00:00:00Z",
  updatedAt: "2026-11-09T00:00:00Z",
  authorId: "author-id",
  readingTime: 1,
  viewCount: 0,
  likeCount: 0,
  toc: [],
  tags: [],
} as ApiData<PostDetailResponse>;

describe("article cover rendering", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["image/png", "/api/v1/media/cover-id/thumbnail/medium", "/api/v1/media/cover-id/thumbnail/xlarge"],
    ["image/svg+xml", "/api/v1/media/cover-id/view", "/api/v1/media/cover-id/view"],
  ])("shares safe %s cover URLs between cards, detail and metadata", async (mimeType, cardUrl, detailUrl) => {
    const post = {
      ...base,
      coverMediaId: "cover-id",
      coverMedia: { id: "cover-id", mimeType, altText: "Cover illustration" },
    } as ApiData<PostDetailResponse>;
    vi.mocked(getPostDetail).mockResolvedValue(post);
    const card = renderToStaticMarkup(<PostCard post={post} />);
    const detail = renderToStaticMarkup(await PostDetailView({ post }));
    const metadata = await generateMetadata({
      params: Promise.resolve({ postType: "articles", slug: post.slug! }),
    });
    expect(card).toContain(`src="${cardUrl}"`);
    expect(detail).toContain(`src="${detailUrl}"`);
    expect(detail).toContain('alt="Cover illustration"');
    expect(metadata.openGraph).toMatchObject({ images: [detailUrl] });
    expect(metadata.twitter).toMatchObject({ images: [detailUrl] });
    expect(card + detail).not.toContain("undefined/api");
  });

  it("does not invent a cover for an article without one", async () => {
    vi.mocked(getPostDetail).mockResolvedValue(base);
    const card = renderToStaticMarkup(<PostCard post={base} />);
    const detail = renderToStaticMarkup(await PostDetailView({ post: base }));
    const metadata = await generateMetadata({
      params: Promise.resolve({ postType: "articles", slug: base.slug! }),
    });
    expect(card + detail).not.toContain("/api/v1/media/");
    expect(metadata.openGraph).toMatchObject({ images: [] });
    expect(metadata.twitter).toMatchObject({ images: [] });
  });

  it("supports an article response with only the media ID", async () => {
    const post = { ...base, coverMediaId: "id-only" };
    expect(renderToStaticMarkup(await PostDetailView({ post }))).toContain(
      'src="/api/v1/media/id-only/thumbnail/xlarge"',
    );
  });
});
