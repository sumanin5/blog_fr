"use client";

import React, { useState } from "react";
import {
  CategoryResponse,
  PagePostShortResponse,
  PostShortResponse,
} from "@/shared/api/generated/types.gen";
import { Sparkles, FileText, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { PostCard } from "./post-card";
import { cn } from "@/lib/utils";

interface PostListViewProps {
  initialData: PagePostShortResponse;
  categories: CategoryResponse[];
  currentCategory?: string;
  page: number;
}

export function PostListView({
  initialData,
  categories,
  currentCategory,
}: PostListViewProps) {
  const [posts] = useState<PostShortResponse[]>(initialData.items);

  return (
    <div className="relative min-h-screen bg-background transition-colors duration-300">
      {/* 1. 全局科技背景 - 固定在底层 */}
      <div
        className="fixed inset-0 z-0 opacity-60 dark:opacity-50 transition-opacity"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* 背景遮罩：大幅降低浓度，让背景图更清晰 */}
      <div className="fixed inset-0 z-1 bg-slate-50/40 dark:bg-slate-950/60" />

      <div className="relative z-10 flex flex-col">
        {/* 2. Hero Section - 居中透明设计 */}
        <section className="relative overflow-hidden py-24 lg:py-40">
          <div className="container mx-auto px-4 text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/40 px-4 py-1.5 text-sm font-medium text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white backdrop-blur-md shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-200 dark:to-purple-200">
                技术分享与实践
              </span>
            </div>

            <h1 className="mb-8 text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-7xl lg:text-8xl leading-none">
              探索
              <span className="mx-2 bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                技术世界
              </span>
              <br />
              构建优秀项目
            </h1>

            <p className="mx-auto max-w-2xl text-lg text-slate-700 dark:text-slate-300 md:text-xl font-medium leading-relaxed">
              深度分享前端开发、架构设计、最佳实践等技术文章。
              为开发者提供有价值的见解和实践指导。
            </p>

            {/* 快速分类导航 (亮色下也更清晰) */}
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              <Link
                href="/posts"
                className={cn(
                  "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all backdrop-blur-md border",
                  !currentCategory
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 border-primary"
                    : "bg-white/60 text-slate-600 hover:bg-white/80 border-black/5 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:border-white/10"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                全部
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/posts?category=${cat.id}`}
                  className={cn(
                    "rounded-full px-5 py-2 text-sm font-medium transition-all backdrop-blur-md border",
                    currentCategory === cat.id
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                      : "bg-white/60 text-slate-600 border-black/5 hover:bg-white/80 dark:bg-white/5 dark:text-slate-300 dark:border-white/10 dark:hover:bg-white/10"
                  )}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 分割线 */}
        <div className="h-px w-full bg-linear-to-r from-transparent via-slate-300 dark:via-white/20 to-transparent" />

        {/* 3. 内容区 */}
        <section className="container mx-auto px-4 py-20">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-black/10 dark:border-white/10 rounded-3xl bg-white/20 dark:bg-white/5 backdrop-blur-xl">
              <FileText className="mb-4 h-16 w-16 opacity-10" />
              <p className="text-xl font-medium text-slate-600 dark:text-white/50">
                暂时没有该分类下的文章
              </p>
              <Link
                href="/posts"
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
      </div>
    </div>
  );
}
