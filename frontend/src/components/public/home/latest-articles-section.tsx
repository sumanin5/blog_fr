import Link from "next/link";
import { ArrowRight, BookOpen, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { routes } from "@/lib/routes";
import type { PostShortResponse } from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";

interface LatestArticlesProps {
  articles: ApiData<PostShortResponse>[];
}

function formatDate(dateString?: string) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function LatestArticlesSection({ articles }: LatestArticlesProps) {
  const items = articles || [];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            文章合集
          </h2>
        </div>
        <Link
          href={routes.postCategories("articles")}
          className="group inline-flex items-center text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 sm:text-sm"
        >
          <span>探索所有专栏</span>
          <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-border/60 bg-card/20 px-6 py-16 text-center backdrop-blur-xs">
          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <div className="text-sm font-semibold text-foreground">
            暂无公开发布的文章
          </div>
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
            在后台发布文章后，它们会按专栏与阅读顺序出现在这里。
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/60 border-y border-border/60">
          {items.map((post, index) => {
            const date = formatDate(post.publishedAt || post.createdAt);

            return (
              <Link
                key={post.id}
                href={routes.postDetailSlug(
                  "articles",
                  post.slug || post.id,
                )}
                className="group grid gap-3 py-5 transition-colors hover:bg-muted/20 sm:grid-cols-[40px_minmax(0,1fr)] sm:gap-5"
              >
                <span className="pt-1 font-mono text-xs tabular-nums text-muted-foreground/50">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {post.category?.name && (
                      <Badge
                        variant="outline"
                        className="border-border/60 px-2 py-0 text-[10px] font-normal text-muted-foreground"
                      >
                        {post.category.name}
                      </Badge>
                    )}
                    {post.tags?.slice(0, 2).map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0 text-[10px] font-normal text-emerald-800 dark:text-emerald-300"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>

                  <h3 className="line-clamp-1 text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400 sm:text-xl">
                    {post.title}
                  </h3>

                  {post.excerpt && (
                    <p className="line-clamp-2 text-xs font-light leading-relaxed text-muted-foreground sm:text-sm">
                      {post.excerpt}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-[11px] text-muted-foreground/70">
                    {date && (
                      <time dateTime={post.publishedAt || post.createdAt}>
                        {date}
                      </time>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.readingTime || 1} 分钟阅读
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
