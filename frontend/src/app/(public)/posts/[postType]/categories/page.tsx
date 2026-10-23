import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { routes } from "@/lib/routes";
import { serverClient } from "@/lib/server-api-client";
import { listCategoriesByType } from "@/shared/api/generated/sdk.gen";
import type { PostType } from "@/shared/api/generated/types.gen";
import { normalizeApiResponse } from "@/shared/api/transformers";
import type { Category } from "@/shared/api/types";

const HEADER_CONFIG: Record<
  string,
  {
    eyebrow: string;
    title: string;
    description: (count: number) => string;
  }
> = {
  articles: {
    eyebrow: "Digital Garden · Collections",
    title: "专栏合集",
    description: (count) =>
      `${count} 个体系化专栏。每篇文章都放在可持续阅读的上下文中，而不是一次性卡片流。`,
  },
  ideas: {
    eyebrow: "Ideas · Domains",
    title: "想法领域",
    description: (count) =>
      `按领域浏览 ${count} 组碎片随想。想法保持单篇即读，不强行包装成系列。`,
  },
};

export default async function CategoryListPage({
  params,
}: {
  params: Promise<{ postType: string }>;
}) {
  const { postType } = await params;

  let activeCategories: Category[] = [];
  try {
    const categoriesRes = await listCategoriesByType({
      client: serverClient,
      path: { post_type: postType as PostType },
      query: { include_inactive: false },
    });

    const data = normalizeApiResponse(categoriesRes.data);
    activeCategories = (data?.items || []).filter(
      (category) => category.isActive !== false,
    );
  } catch (error) {
    console.warn("Failed to fetch categories:", error);
  }

  const config = HEADER_CONFIG[postType] || {
    eyebrow: "Knowledge Collections",
    title: "专栏分类",
    description: (count: number) => `浏览 ${count} 个主题合集。`,
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-[1200px] px-4 py-10 md:px-6 lg:py-14">
        <Link
          href={routes.postList(postType)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <BookOpen className="h-3.5 w-3.5" />
          返回内容首页
        </Link>

        <header className="mt-8 max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
            {config.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {config.title}
          </h1>
          <p className="mt-4 text-sm font-light leading-relaxed text-muted-foreground sm:text-base">
            {config.description(activeCategories.length)}
          </p>
        </header>

        {activeCategories.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/20 py-16 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-lg">
              📂
            </div>
            <h2 className="mt-4 text-sm font-semibold text-foreground">
              专栏筹备中
            </h2>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
              当前没有公开专栏。创建并发布分类后，它会自动出现在这里。
            </p>
          </div>
        ) : (
          <div className="mt-12 divide-y divide-border/60 border-y border-border/60">
            {activeCategories.map((category, index) => (
              <Link
                key={category.id}
                href={routes.postCategory(postType, category.slug)}
                className="group grid grid-cols-[42px_minmax(0,1fr)_auto] items-start gap-4 py-6 transition-colors hover:bg-muted/20 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:gap-6"
              >
                <span className="pt-1 font-mono text-xs tabular-nums text-muted-foreground/60">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400 sm:text-lg">
                      {category.name}
                    </h2>
                    <Badge
                      variant="secondary"
                      className="border-none bg-muted px-2 py-0 text-[10px] font-normal text-muted-foreground"
                    >
                      {category.postCount ?? 0} 篇
                    </Badge>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm font-light leading-relaxed text-muted-foreground">
                    {category.excerpt ||
                      category.description ||
                      "查看该专栏下的文章目录与阅读顺序。"}
                  </p>
                </div>

                <ArrowUpRight className="mt-1 h-4 w-4 text-muted-foreground/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
