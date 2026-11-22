import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";
import { getFeaturedCategories } from "@/lib/categories-api";
import { getFeaturedPosts, getPosts } from "@/lib/post-api";
import type { PostShortResponse } from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";

vi.mock("@/lib/categories-api", () => ({
  getFeaturedCategories: vi.fn(),
}));
vi.mock("@/lib/post-api", () => ({
  getPosts: vi.fn(),
  getFeaturedPosts: vi.fn(),
}));
vi.mock("@/components/public/home/hero-section", () => ({
  HeroSection: () => null,
}));
vi.mock("@/components/public/home/featured-categories-section", () => ({
  FeaturedCategoriesSection: () => null,
}));
vi.mock("@/components/public/home/latest-articles-section", () => ({
  LatestArticlesSection: () => null,
}));
vi.mock("@/components/public/home/connect-section", () => ({
  ConnectSection: () => null,
}));

function makePost(
  overrides: Partial<ApiData<PostShortResponse>>,
): ApiData<PostShortResponse> {
  return {
    id: "post-id",
    title: "Post title",
    slug: "post-slug",
    postType: "ideas",
    status: "published",
    authorId: "author-id",
    readingTime: 3,
    viewCount: 0,
    likeCount: 0,
    bookmarkCount: 0,
    createdAt: "2026-11-14T18:00:00Z",
    updatedAt: "2026-11-14T18:00:00Z",
    publishedAt: "2026-11-14T18:00:00Z",
    isFeatured: false,
    allowComments: true,
    tags: [],
    ...overrides,
  } as ApiData<PostShortResponse>;
}

describe("Home page data fetching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getFeaturedCategories).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      size: 3,
      pages: 0,
    });
  });

  it("fetches latest ideas regardless of isFeatured so new thoughts appear immediately", async () => {
    vi.mocked(getPosts).mockImplementation(async (postType) => {
      if (postType === "articles") {
        return { items: [], total: 0, page: 1, size: 4, pages: 0 };
      }
      return {
        items: [
          makePost({
            id: "idea-latest",
            title: "作为一个过来人的一点想法",
            slug: "guo-lai-ren",
            isFeatured: false,
            publishedAt: "2026-11-14T18:00:00Z",
          }),
          makePost({
            id: "idea-featured",
            title: "我觉得我的人生需要一点折腾",
            slug: "zhe-teng",
            isFeatured: true,
            publishedAt: "2026-11-10T14:49:37Z",
          }),
        ],
        total: 2,
        page: 1,
        size: 4,
        pages: 1,
      };
    });

    const html = renderToStaticMarkup(await Home());

    expect(getPosts).toHaveBeenCalledWith("articles", 1, 4);
    expect(getPosts).toHaveBeenCalledWith("ideas", 1, 4);
    expect(getFeaturedPosts).not.toHaveBeenCalled();
    expect(html).toContain("作为一个过来人的一点想法");
    expect(html).toContain("我觉得我的人生需要一点折腾");
  });

  it("renders empty state when fetching latest ideas fails", async () => {
    vi.mocked(getPosts).mockRejectedValue(new Error("backend unavailable"));

    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("暂无即时随想");
  });
});
