import type { MetadataRoute } from "next";

import { PRODUCTS } from "@/config/products";
import { getCategories } from "@/lib/categories-api";
import { routes } from "@/lib/routes";
import { POST_TYPES, absoluteUrl, getAllPublishedPosts } from "@/lib/seo";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl(routes.home), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl(routes.about), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/projects"), changeFrequency: "monthly", priority: 0.6 },
    ...PRODUCTS.map((product) => ({
      url: absoluteUrl(`/projects/${product.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];

  const perType = await Promise.all(
    POST_TYPES.map(async (postType) => {
      const [posts, categories] = await Promise.all([
        getAllPublishedPosts(postType),
        getCategories(postType).catch(() => null),
      ]);

      const entries: MetadataRoute.Sitemap = [
        {
          url: absoluteUrl(routes.postCategories(postType)),
          changeFrequency: "weekly",
          priority: 0.7,
        },
        ...(categories?.items ?? [])
          .filter((category) => category.isActive !== false)
          .map((category) => ({
          url: absoluteUrl(routes.postCategory(postType, category.slug)),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        })),
        ...posts.map((post) => ({
          url: absoluteUrl(routes.postDetailSlug(postType, post.slug)),
          lastModified: post.updatedAt || post.publishedAt || undefined,
          changeFrequency: "monthly" as const,
          priority: postType === "articles" ? 0.8 : 0.5,
        })),
      ];
      return entries;
    }),
  );

  return [...staticEntries, ...perType.flat()];
}
