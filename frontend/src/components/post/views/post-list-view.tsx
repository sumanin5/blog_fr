import React from "react";
import {
  CategoryResponse,
  PagePostShortResponse,
  PostShortResponse,
  PostType,
} from "@/shared/api/generated/types.gen";
import { ApiData } from "@/shared/api/transformers";
import { Sparkles, FileText, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { PostCard } from "./post-card";
import { cn } from "@/lib/utils";

import { HeroWrapper } from "@/components/layout/hero-wrapper";

interface PostListViewProps {
  initialData: ApiData<PagePostShortResponse>;
  categories: CategoryResponse[];
  currentCategory?: string;
  page: number;
  postType: PostType;
}

export function PostListView({
  initialData,
  categories,
  currentCategory,
  postType,
}: PostListViewProps) {
  const posts: ApiData<PostShortResponse>[] = initialData.items;

  return (
    <HeroWrapper>
      {/* 2. Hero Section - 居中透明设计 */}
      <section className="relative overflow-hidden py-24 lg:py-40">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium backdrop-blur-sm dark:bg-white/5 shadow-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-200 dark:to-purple-200">
              技术分享与实践
            </span>
          </div>

          <h1 className="mb-8 text-5xl font-extrabold tracking-tight text-foreground md:text-7xl lg:text-8xl leading-none">
            探索
            <span className="mx-2 bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              技术世界
            </span>
            <br />
            构建优秀项目
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl font-medium leading-relaxed">
            深度分享前端开发、架构设计、最佳实践等技术文章。
            为开发者提供有价值的见解和实践指导。
          </p>

          {/* 快速分类导航 (亮色下也更清晰) */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Link
              href={`/posts/${postType}`}
              className={cn(
                "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all border backdrop-blur-sm dark:backdrop-blur-md",
                !currentCategory
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 border-primary"
                  : "bg-card hover:bg-accent border-border dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10",
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              全部
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/posts/${postType}?category=${cat.id}`}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-medium transition-all border backdrop-blur-sm dark:backdrop-blur-md",
                  currentCategory === cat.id
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                    : "bg-card hover:bg-accent border-border dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10",
                )}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 分割线 */}
      <div className="h-px w-full bg-linear-to-r from-transparent via-border to-transparent" />

      {/* 3. 内容区 */}
      <section className="container mx-auto px-4 py-20">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-border rounded-3xl bg-card backdrop-blur-sm dark:bg-white/5 dark:backdrop-blur-xl">
            <FileText className="mb-4 h-16 w-16 opacity-10" />
            <p className="text-xl font-medium text-muted-foreground">
              暂时没有该分类下的文章
            </p>
            <Link
              href={`/posts/${postType}`}
              className="mt-4 text-primary hover:underline font-bold"
            >
              查看全部文章
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </HeroWrapper>
  );
}
