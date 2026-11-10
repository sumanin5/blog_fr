import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";

import { routes } from "@/lib/routes";
import type { PostShortResponse } from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";

interface ThoughtsProps {
  posts: ApiData<PostShortResponse>[];
}

function formatDate(dateString?: string) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function ThoughtsSection({ posts }: ThoughtsProps) {
  const items = posts || [];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            单篇想法
          </h2>
        </div>
        <Link
          href={routes.postList("ideas")}
          className="group inline-flex items-center text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 sm:text-sm"
        >
          <span>漫游灵感流</span>
          <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-border/60 bg-card/20 px-6 py-16 text-center backdrop-blur-xs">
          <Lightbulb className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <div className="text-sm font-semibold text-foreground">
            暂无即时随想
          </div>
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
            灵感闪现时，新的单篇想法会实时流淌在这里。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((post) => {
            const date = formatDate(post.publishedAt || post.createdAt);

            return (
              <Link
                key={post.id}
                href={routes.postDetailSlug("ideas", post.slug || post.id)}
                className="group block rounded-xl border border-border/40 bg-card/40 p-4 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/30 hover:bg-muted/40"
              >
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500 transition-transform group-hover:scale-125" />
                    <h3 className="text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400 sm:text-base">
                      {post.title}
                    </h3>
                  </div>

                  {post.excerpt && (
                    <p className="line-clamp-2 pl-4 text-xs font-light leading-relaxed text-muted-foreground sm:text-sm">
                      {post.excerpt}
                    </p>
                  )}

                  {date && (
                    <div className="pl-4 pt-1 font-mono text-[11px] text-muted-foreground/60">
                      <time dateTime={post.publishedAt || post.createdAt}>
                        {date}
                      </time>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
