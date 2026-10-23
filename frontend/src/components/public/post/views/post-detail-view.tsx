import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { ArticleTracker } from "@/components/admin/analytics/ArticleTracker";
import { ArticleNavigation } from "@/components/public/docs/article-navigation";
import { CopyPageMenu } from "@/components/public/docs/copy-page-menu";
import { TableOfContents } from "@/components/public/mdx/utils/table-of-contents";
import { PostContent } from "@/components/public/post/content/post-content";
import { PostMeta } from "@/components/public/post/components/post-meta";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  getSeriesNeighbors,
  sortSeriesPosts,
} from "@/lib/article-series";
import { parseArticleMarkdown, requiresMdxRenderer } from "@/lib/markdown/article-markdown";
import { getPosts } from "@/lib/post-api";
import { routes } from "@/lib/routes";
import type {
  PostDetailResponse,
  PostShortResponse,
  PostType,
} from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";

interface TocItem {
  id: string;
  title: string;
  level: number;
}

interface PostDetailViewProps {
  post: ApiData<PostDetailResponse>;
}

export async function PostDetailView({ post }: PostDetailViewProps) {
  const postType = (post.postType || "articles") as PostType;
  const source = post.contentMdx || undefined;
  const useTanStackMarkdown = Boolean(
    source && !requiresMdxRenderer(source, { enableJsx: post.enableJsx }),
  );

  // 即使正文回退到 MDX，也先用 Markdown AST 收集标题，
  // 这样右侧目录不依赖后端 toc 是否为空。
  const parsedMarkdown = source
    ? parseArticleMarkdown(source, { stripLeadingHeading: true })
    : null;

  const fallbackToc = (post.toc || []) as TocItem[];
  const toc = parsedMarkdown?.headings.length
    ? parsedMarkdown.headings
    : fallbackToc;

  const category = post.category;
  let seriesPosts: ApiData<PostShortResponse>[] = [];

  try {
    const seriesData = await getPosts(postType, 1, 100, category?.id);
    seriesPosts = sortSeriesPosts(seriesData.items);
  } catch (error) {
    console.warn("Failed to load series articles for docs navigation:", error);
  }

  if (seriesPosts.length === 0) {
    seriesPosts = [post as ApiData<PostShortResponse>];
  }

  const currentSlug = post.slug || post.id;
  const { previous, next } = getSeriesNeighbors(seriesPosts, currentSlug);
  const markdownHref = post.slug
    ? routes.postMarkdown(postType, post.slug)
    : undefined;

  return (
    <div className="relative min-h-screen">
      <ArticleTracker postId={post.id} />

      <div className="border-b border-border/50 bg-background/60 backdrop-blur-sm">
        <div className="container mx-auto flex min-h-14 max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-2 md:px-6">
          <Breadcrumb className="min-w-0">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={routes.postCategories(postType)}>专栏</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {category?.slug && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href={routes.postCategory(postType, category.slug)}>
                        {category.name}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="block max-w-[28rem] truncate">
                  {post.title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center gap-2">
            <ArticleNavigation
              mode="sheet"
              posts={seriesPosts}
              postType={postType}
              currentSlug={currentSlug}
              category={category}
            />
            <TableOfContents toc={toc} mode="sheet" />
            {source && (
              <CopyPageMenu markdown={source} markdownHref={markdownHref} />
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-[1440px] px-4 py-8 md:px-6 lg:py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_200px]">
          <ArticleNavigation
            posts={seriesPosts}
            postType={postType}
            currentSlug={currentSlug}
            category={category}
          />

          <div className="min-w-0">
            <article className="mx-auto max-w-4xl">
              <header className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="rounded-full px-3 py-0.5 text-[11px] font-normal"
                  >
                    {postType === "ideas" ? "Thought" : "Article"}
                  </Badge>
                  {category?.name && (
                    <Badge
                      variant="outline"
                      className="rounded-full px-3 py-0.5 text-[11px] font-normal text-muted-foreground"
                    >
                      {category.name}
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  {post.title}
                </h1>

                {post.excerpt && (
                  <p className="max-w-4xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
                    {post.excerpt}
                  </p>
                )}

                {post.author && (
                  <PostMeta
                    author={{
                      username: post.author.username,
                      full_name: post.author.fullName || undefined,
                      avatar: post.author.avatar || undefined,
                    }}
                    publishedAt={post.publishedAt || ""}
                    readingTime={post.readingTime || 0}
                    viewCount={post.viewCount || 0}
                  />
                )}

                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="rounded-full border-none bg-primary/8 px-3 py-0.5 text-[11px] font-normal text-primary"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </header>

              <Separator className="my-8" />

              <PostContent
                mdx={source}
                ast={post.contentAst}
                toc={toc}
                enableJsx={post.enableJsx}
                useServerRendering={post.useServerRendering}
                tanstackDocument={
                  useTanStackMarkdown ? parsedMarkdown?.document : undefined
                }
              />

              {(previous || next) && (
                <nav className="mt-14 grid gap-4 border-t border-border/60 pt-8 sm:grid-cols-2">
                  {previous ? (
                    <Link
                      href={routes.postDetailSlug(
                        postType,
                        previous.slug || previous.id,
                      )}
                      className="group rounded-xl border border-border/60 p-4 transition-colors hover:border-emerald-500/40 hover:bg-muted/30"
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                        上一篇
                      </span>
                      <span className="mt-2 line-clamp-2 block text-sm font-medium text-foreground">
                        {previous.title}
                      </span>
                    </Link>
                  ) : (
                    <div />
                  )}

                  {next && (
                    <Link
                      href={routes.postDetailSlug(
                        postType,
                        next.slug || next.id,
                      )}
                      className="group rounded-xl border border-border/60 p-4 text-right transition-colors hover:border-emerald-500/40 hover:bg-muted/30 sm:col-start-2"
                    >
                      <span className="flex items-center justify-end gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        下一篇
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                      <span className="mt-2 line-clamp-2 block text-sm font-medium text-foreground">
                        {next.title}
                      </span>
                    </Link>
                  )}
                </nav>
              )}
            </article>
          </div>

          <TableOfContents
            toc={toc}
            mode="sidebar"
            className="hidden self-start xl:sticky xl:top-20 xl:block"
          />
        </div>
      </div>
    </div>
  );
}
