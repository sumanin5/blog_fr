"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSearchPosts } from "@/hooks/use-posts";
import { PostCard } from "@/components/public/post/views/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, SearchX } from "lucide-react";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("search") || "";

  const { posts: allPosts, isLoading } = useSearchPosts(query);

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">请输入搜索关键词</h2>
        <p className="text-muted-foreground">在上方搜索栏输入内容以开始搜索</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (allPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-8">
        <SearchX className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">未找到相关内容</h2>
        <p className="text-muted-foreground">
          尝试使用不同的关键词搜索 &quot;{query}&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          搜索结果: <span className="text-primary">&quot;{query}&quot;</span>
        </h1>
        <span className="text-muted-foreground text-sm">
          共找到 {allPosts.length} 篇相关内容
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {allPosts.map((post) => (
          <PostCard key={post.id} post={post as any} postType={post.postType} />
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl min-h-screen">
      <Suspense fallback={<div className="h-32" />}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
