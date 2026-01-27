"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Box } from "lucide-react";

import { listCategoriesByType } from "@/shared/api/generated/sdk.gen";
import { PostType } from "@/shared/api/generated/types.gen";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getThumbnailUrl } from "@/lib/media-utils";

export function FeaturedCategories() {
  // 获取精选分类
  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ["categories", "articles", "featured"],
    queryFn: () =>
      // @ts-ignore - API SDK 类型尚未包含 is_featured，但后端支持
      listCategoriesByType({
        path: { post_type: "articles" },
        query: { is_featured: true, size: 6 },
      }),
  });

  const categories = categoriesData?.data?.items || [];

  if (isLoading) {
    return <CategoriesSkeleton />;
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-8 md:mb-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              探索主题
            </h2>
            <p className="mt-2 text-muted-foreground">
              深入了解您感兴趣的技术领域
            </p>
          </div>
          <Link
            href="/posts/articles/categories"
            className="flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            查看全部 <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/posts/articles/categories/${category.slug}`}
              className="group block outline-none"
            >
              <Card className="h-full overflow-hidden border-0 bg-background shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-0 flex h-full">
                  {/* 左侧/上方图片 */}
                  <div className="relative w-1/3 aspect-[4/3] md:aspect-square overflow-hidden">
                    {category.cover_media_id ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          getThumbnailUrl(category.cover_media_id, "medium") ||
                          ""
                        }
                        alt={category.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="h-full w-full bg-secondary/50 flex items-center justify-center">
                        <Box className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                  </div>

                  {/* 右侧内容 */}
                  <div className="flex-1 p-6 flex flex-col justify-center">
                    <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {category.description}
                      </p>
                    )}
                    <div className="mt-auto text-xs font-medium text-muted-foreground/70 bg-secondary/50 w-fit px-2 py-1 rounded-full">
                      {category.post_count || 0} 篇文章
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoriesSkeleton() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-background rounded-lg p-4 flex gap-4 border"
            >
              <Skeleton className="h-full aspect-square rounded-md" />
              <div className="flex-1 space-y-2 py-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
