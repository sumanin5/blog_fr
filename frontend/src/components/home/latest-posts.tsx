"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

import { listPostsByType } from "@/shared/api/generated/sdk.gen";
import { PostCard } from "@/components/post/views/post-card";
import { Skeleton } from "@/components/ui/skeleton";

// --- 配置区域 ---
type SectionConfig = {
  postType: "articles" | "ideas";
  title: string;
  highlight: string; // 标题中的高亮词
  linkText: string;
  bgClass?: string;
  limit?: number;
};

const SECTIONS: SectionConfig[] = [
  {
    postType: "articles",
    title: "Articles",
    highlight: "Latest",
    linkText: "浏览文章",
    limit: 3,
  },
  {
    postType: "ideas",
    title: "Ideas",
    highlight: "Fresh",
    linkText: "更多想法",
    bgClass: "bg-secondary/30 text-secondary-foreground",
    limit: 3,
  },
];

// --- 主组件 ---
export function LatestContentSections() {
  return (
    <>
      {SECTIONS.map((section) => (
        <PostSection key={section.postType} config={section} />
      ))}
    </>
  );
}

// --- 通用子组件 ---
function PostSection({ config }: { config: SectionConfig }) {
  const { postType, title, highlight, linkText, bgClass, limit = 6 } = config;

  const { data: postsData, isLoading } = useQuery({
    queryKey: ["posts", postType, "latest"],
    queryFn: () =>
      listPostsByType({
        path: { post_type: postType }, // 这里的类型匹配可能需要注意，但字符串是安全的
        query: { size: limit },
      }),
  });

  const posts = postsData?.data?.items || [];

  if (isLoading) {
    // 仅在非透明背景（通常是主要内容区）显示骨架屏，避免页面闪烁过度
    if (!bgClass) return <PostsSkeleton />;
    return null;
  }

  if (posts.length === 0) return null;

  return (
    <section className={cn("py-16 md:py-24 transition-colors", bgClass)}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8 md:mb-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <span className="text-primary">{highlight}</span> {title}
          </h2>
          <Link
            href={`/posts/${postType}`}
            className="flex items-center text-sm font-medium hover:text-primary transition-colors"
          >
            {linkText} <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post as any} // 暂时忽略生成的类型差异
              postType={postType}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PostsSkeleton() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
