"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PostCard } from "@/components/public/post/views/post-card";
import { Button } from "@/components/ui/button";
import type { PostShortResponse } from "@/shared/api/generated/types.gen";
import { ApiData } from "@/shared/api/transformers";

interface FeaturedProps {
  posts: ApiData<PostShortResponse>[];
}

export function FeaturedSection({ posts }: FeaturedProps) {
  // 如果没有数据，可以显示 Skeleton 或 Empty State
  // 但由于数据在服务端已获取，这里通常是直接渲染
  if (!posts?.length) {
    return null; // 或者显示暂无内容组件
  }

  return (
    <section className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border/50 pb-6 gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">精选文章</h2>
          <p className="text-muted-foreground text-lg font-light">
            架构设计、技术教程与系统实践。
          </p>
        </div>
        <Link
          href="/posts/articles"
          className="group hidden sm:inline-flex text-sm font-medium text-primary items-center gap-1 hover:text-primary/80 transition-colors"
        >
          查看全部归档{" "}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} postType="articles" />
        ))}
      </div>

      <div className="sm:hidden text-center">
        <Link href="/posts/articles">
          <Button variant="outline" className="w-full">
            查看全部归档
          </Button>
        </Link>
      </div>
    </section>
  );
}
