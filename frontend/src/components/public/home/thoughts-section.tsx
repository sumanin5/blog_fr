"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PostCard } from "@/components/public/post/views/post-card";
import { Button } from "@/components/ui/button";
import type { PostShortResponse } from "@/shared/api/generated/types.gen";
import { ApiData } from "@/shared/api/transformers";

interface ThoughtsProps {
  posts: any[];
}

export function ThoughtsSection({ posts }: ThoughtsProps) {
  if (!posts?.length) {
    return null;
  }

  return (
    <section className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border/50 pb-6 gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">灵感瞬间</h2>
          <p className="text-muted-foreground text-lg font-light">
            意识流、小技巧与生活随笔。
          </p>
        </div>
        <Link
          href="/posts/ideas"
          className="group hidden sm:inline-flex text-sm font-medium text-primary items-center gap-1 hover:text-primary/80 transition-colors"
        >
          查看全部想法{" "}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} postType="ideas" />
        ))}
      </div>

      <div className="sm:hidden text-center">
        <Link href="/posts/ideas">
          <Button variant="outline" className="w-full">
            查看全部想法
          </Button>
        </Link>
      </div>
    </section>
  );
}
