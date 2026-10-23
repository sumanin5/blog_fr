import Link from "next/link";
import { notFound } from "next/navigation";
import { Layers } from "lucide-react";

import { ArticleNavigation } from "@/components/public/docs/article-navigation";
import { CollectionArticleList } from "@/components/public/docs/collection-article-list";
import { MdxServerRenderer } from "@/components/public/post/content/renderers/mdx-server-renderer";
import { TanStackMarkdownRenderer } from "@/components/public/post/content/renderers/tanstack-markdown-renderer";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { sortSeriesPosts } from "@/lib/article-series";
import {
  parseArticleMarkdown,
  requiresMdxRenderer,
} from "@/lib/markdown/article-markdown";
import { routes } from "@/lib/routes";
import { serverClient } from "@/lib/server-api-client";
import {
  listCategoriesByType,
  listPostsByType,
} from "@/shared/api/generated/sdk.gen";
import type {
  PostShortResponse,
  PostType,
} from "@/shared/api/generated/types.gen";
import { normalizeApiResponse, type ApiData } from "@/shared/api/transformers";
import type { Category } from "@/shared/api/types";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ postType: string; slug: string }>;
}) {
  const { postType, slug } = await params;

  const categoriesRes = await listCategoriesByType({
    client: serverClient,
    path: { post_type: postType as PostType },
  });

  if (categoriesRes.error || !categoriesRes.data) {
    console.error("Failed to fetch categories list", categoriesRes.error);
  }

  const data = normalizeApiResponse(categoriesRes.data);
  const category: Category | undefined = data?.items?.find(
    (item) => item.slug === slug,
  );

  if (!category) {
    notFound();
  }

  let posts: ApiData<PostShortResponse>[] = [];
  try {
    const postsRes = await listPostsByType({
      client: serverClient,
      path: { post_type: postType as PostType },
      query: {
        category_id: category.id,
        page: 1,
        size: 100,
      },
    });
    posts = sortSeriesPosts(normalizeApiResponse(postsRes.data?.items ?? []));
  } catch (error) {
    console.warn("Failed to fetch posts for category:", error);
  }

  const tanstackDescription =
    category.description && !requiresMdxRenderer(category.description)
      ? parseArticleMarkdown(category.description, {
          stripLeadingHeading: true,
        })
      : null;

  return (
    <div className="min-h-screen">
      <div className="border-b border-border/50 bg-background/60 backdrop-blur-sm">
        <div className="container mx-auto max-w-[1440px] px-4 py-8 md:px-6 lg:py-10">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={routes.postCategories(postType)}>专栏</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{category.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mt-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-2xl">
              {category.iconPreset || (
                <Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant="secondary"
                  className="rounded-full px-3 py-0.5 text-[11px] font-normal"
                >
                  Collection
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {posts.length} 篇文章
                </span>
              </div>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {category.name}
              </h1>

              {category.excerpt && (
                <p className="mt-3 max-w-4xl text-sm font-light leading-relaxed text-muted-foreground sm:text-base">
                  {category.excerpt}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-[1440px] px-4 py-8 md:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <ArticleNavigation
            posts={posts}
            postType={postType}
            category={category}
          />

          <div className="min-w-0">
            {category.description && (
              <div className="mb-10 max-w-4xl text-sm text-muted-foreground">
                {tanstackDescription ? (
                  <TanStackMarkdownRenderer
                    document={tanstackDescription.document}
                    articleClassName="prose prose-sm max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-p:leading-relaxed prose-a:text-primary"
                  />
                ) : (
                  <MdxServerRenderer
                    mdx={category.description}
                    toc={[]}
                    articleClassName="prose prose-sm max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-p:leading-relaxed prose-a:text-primary"
                  />
                )}
              </div>
            )}

            <section className="max-w-4xl">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    文章目录
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    按发布时间顺序排列
                  </p>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {posts.length} entries
                </span>
              </div>

              {posts.length > 0 ? (
                <CollectionArticleList posts={posts} postType={postType} />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/20 py-16 text-sm text-muted-foreground">
                  该专栏下暂无文章
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
