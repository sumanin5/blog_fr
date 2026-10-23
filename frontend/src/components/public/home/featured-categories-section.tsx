import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { routes } from "@/lib/routes";
import type { Category } from "@/shared/api/types";

interface FeaturedCategoriesProps {
  categories: Category[];
}

export function FeaturedCategoriesSection({
  categories,
}: FeaturedCategoriesProps) {
  const items = categories || [];

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            专栏合集
          </h2>
        </div>
        <Link
          href={routes.postCategories("articles")}
          className="group inline-flex items-center text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 sm:text-sm"
        >
          <span>查看全部</span>
          <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((category, index) => (
          <Link
            key={category.id}
            href={routes.postCategory("articles", category.slug)}
            className="group flex flex-col border-t border-border/60 py-5 transition-colors hover:border-emerald-500/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground/50">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  {category.name}
                </h3>
              </div>

              <ArrowRight className="mt-0.5 h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
            </div>

            <p className="mt-3 line-clamp-3 text-xs font-light leading-relaxed text-muted-foreground sm:text-sm">
              {category.excerpt ||
                category.description ||
                "查看该专栏下的文章目录与阅读顺序。"}
            </p>

            <div className="mt-4">
              <Badge
                variant="secondary"
                className="border-none bg-muted px-2.5 py-0 text-[10px] font-normal text-muted-foreground"
              >
                {category.postCount ?? 0} 篇文章
              </Badge>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
