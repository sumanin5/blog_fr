import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getPostHref } from "@/lib/article-series";
import type { PostShortResponse, PostType } from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";

interface CollectionArticleListProps {
  posts: ApiData<PostShortResponse>[];
  postType: PostType | string;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function CollectionArticleList({
  posts,
  postType,
}: CollectionArticleListProps) {
  return (
    <div className="divide-y divide-border/60 border-y border-border/60">
      {posts.map((post, index) => {
        const date = formatDate(post.publishedAt || post.createdAt);

        return (
          <Link
            key={post.id}
            href={getPostHref(postType, post)}
            className="group grid gap-3 py-6 transition-colors hover:bg-muted/20 sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:gap-5"
          >
            <span className="pt-1 font-mono text-xs tabular-nums text-muted-foreground/60">
              {String(index + 1).padStart(2, "0")}
            </span>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400 sm:text-lg">
                  {post.title}
                </h3>
                {post.tags?.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="border-none bg-muted px-2 py-0 text-[10px] font-normal text-muted-foreground"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>

              {post.excerpt && (
                <p className="line-clamp-2 text-sm font-light leading-relaxed text-muted-foreground">
                  {post.excerpt}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/70">
                {date && <time dateTime={post.publishedAt || post.createdAt}>{date}</time>}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {post.readingTime || 1} 分钟阅读
                </span>
              </div>
            </div>

            <ArrowUpRight className="hidden h-4 w-4 text-muted-foreground/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 sm:block" />
          </Link>
        );
      })}
    </div>
  );
}
