"use client";

import React from "react";
import {
  PagePostShortResponse,
  PostShortResponse,
  PostType,
} from "@/shared/api/generated/types.gen";
import { ApiData } from "@/shared/api/transformers";
import {
  FileText,
  LayoutGrid,
  Lightbulb,
  ArrowRight,
  BookOpen,
  PenTool,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PostCard } from "./post-card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "../../common/page-header";
import { PageBackground } from "../../common/page-background";

// ============================================================================
// 视图策略配置 (View Strategy)
// ============================================================================

interface ViewConfig {
  CardComponent: React.ComponentType<{
    post: ApiData<PostShortResponse>;
    postType?: string;
  }>;
  gridClass: string;
  EmptyIcon: React.ElementType;
  hero: {
    tagline: string;
    title: string;
    description: string;
    icon: React.ElementType;
  };
}

const VIEW_STRATEGIES: Record<string, ViewConfig> = {
  articles: {
    CardComponent: PostCard,
    gridClass: "grid gap-8 md:grid-cols-2 lg:grid-cols-3",
    EmptyIcon: FileText,
    hero: {
      tagline: "Technical Archives & Engineering",
      title: "Code, Logic &",
      description:
        "探索技术世界，构建优秀项目。深度分享前端架构、后端工程与全栈开发实践。",
      icon: BookOpen,
    },
  },
  ideas: {
    CardComponent: PostCard,
    gridClass: "grid gap-6 sm:grid-cols-2 lg:grid-cols-4",
    EmptyIcon: Lightbulb,
    hero: {
      tagline: "Digital Garden & Midnight Musings",
      title: "Thoughts &",
      description:
        "记录稍纵即逝的灵感。这里是我的思维花园，包含各种碎碎念、代码片段和生活感悟。",
      icon: PenTool,
    },
  },
};

const SECONDARY_LABELS: Record<string, string> = {
  articles: "Patterns",
  ideas: "Creation",
};

const DEFAULT_STRATEGY = VIEW_STRATEGIES.articles;

// ============================================================================
// 组件实现
// ============================================================================

interface PostListViewProps {
  initialData: ApiData<PagePostShortResponse>;
  tags: { id: string; name: string }[];
  currentTag?: string;
  postType: PostType;
  page: number;
}

export function PostListView({
  initialData,
  tags,
  currentTag,
  postType,
}: PostListViewProps) {
  const posts: ApiData<PostShortResponse>[] = initialData.items;
  const strategy = VIEW_STRATEGIES[postType as string] || DEFAULT_STRATEGY;
  const { gridClass, EmptyIcon, hero } = strategy;

  return (
    <div className="flex flex-col min-h-screen relative">
      <PageBackground isFixed={true} />

      <main className="relative z-10">
        {/* 1. Hero Section */}
        <section className="relative w-full min-h-[60vh] flex flex-col items-center justify-center pt-24">
          <PageHeader
            tagline={hero.tagline}
            title={hero.title}
            subtitle={SECONDARY_LABELS[postType as string]}
            description={hero.description}
          >
            {/* Tag Filter Chips */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link href={`/posts/${postType}`} scroll={false}>
                <Button
                  variant={!currentTag ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-full px-6 transition-all",
                    !currentTag
                      ? "shadow-lg shadow-primary/20"
                      : "bg-background/40 backdrop-blur-sm",
                  )}
                >
                  <LayoutGrid className="mr-2 h-3.5 w-3.5" />
                  全部
                </Button>
              </Link>
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/posts/${postType}?tag=${tag.id}`}
                  scroll={false}
                >
                  <Button
                    variant={currentTag === tag.id ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "rounded-full px-6 transition-all",
                      currentTag === tag.id
                        ? "shadow-lg shadow-primary/20"
                        : "bg-background/40 backdrop-blur-sm",
                    )}
                  >
                    #{tag.name}
                  </Button>
                </Link>
              ))}
            </div>
          </PageHeader>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
            <ArrowRight className="h-5 w-5 rotate-90" />
          </div>
        </section>

        {/* 3. Main Content Grid */}
        <section className="container mx-auto px-4 md:px-6 py-20 min-h-[40vh]">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border/60 rounded-3xl bg-card/20 backdrop-blur-sm">
              <EmptyIcon className="mb-4 h-16 w-16 opacity-10" />
              <p className="text-xl font-medium text-muted-foreground/60">
                暂时没有相关内容
              </p>
            </div>
          ) : (
            <div className={gridClass}>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} postType={postType} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
