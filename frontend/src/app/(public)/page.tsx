import React from "react";
import { getFeaturedCategories } from "@/lib/categories-api";
import { getFeaturedPosts } from "@/lib/post-api";
import { HeroSection } from "@/components/public/home/hero-section";
import { FeaturedCategoriesSection } from "@/components/public/home/featured-categories-section";
import { ThoughtsSection } from "@/components/public/home/thoughts-section";

export const dynamic = "force-dynamic";
// export const revalidate = 3600; // 或者使用 ISR

export default async function Home() {
  // 并行获取数据
  const [featuredCategoriesData, featuredThoughtsData] = await Promise.all([
    getFeaturedCategories("articles", 3),
    getFeaturedPosts("ideas", 4),
  ]);

  // Normalize: snake_case -> camelCase
  // 注意：API Layer (lib/*) 已经处理了 `normalizeApiResponse`，此处直接使用即可
  const thoughtsItems = featuredThoughtsData.items || [];
  const categoryItems = featuredCategoriesData.items || [];

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />

      <div className="container mx-auto px-4 md:px-6 py-24 space-y-32">
        {/* 精选分类 */}
        <FeaturedCategoriesSection categories={categoryItems} />

        {/* 灵感瞬间 */}
        <ThoughtsSection posts={thoughtsItems} />
      </div>
    </div>
  );
}
