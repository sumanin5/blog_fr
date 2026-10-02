import React from "react";
import { getFeaturedCategories } from "@/lib/categories-api";
import { getFeaturedPosts, getPosts } from "@/lib/post-api";
import { HeroSection } from "@/components/public/home/hero-section";
import { FeaturedCategoriesSection } from "@/components/public/home/featured-categories-section";
import { LatestArticlesSection } from "@/components/public/home/latest-articles-section";
import { ThoughtsSection } from "@/components/public/home/thoughts-section";
import { ConnectSection } from "@/components/public/home/connect-section";
import {
  MOCK_FEATURED_COLLECTIONS,
  MOCK_LATEST_ARTICLES,
  MOCK_THOUGHTS,
} from "@/config/home-mock-data";
import type { Category } from "@/shared/api/types";
import type { PostShortResponse } from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";

export const dynamic = "force-dynamic";

export default async function Home() {
  // 1. 数据获取：优先拉取后端动态数据，若后端未就绪或为空，无缝平滑回退至高保真展示案例数据
  let categoryItems: Category[] = [];
  let articleItems: ApiData<PostShortResponse>[] = [];
  let thoughtItems: ApiData<PostShortResponse>[] = [];

  try {
    const [categoriesData, articlesData, thoughtsData] = await Promise.all([
      getFeaturedCategories("articles", 3).catch(() => null),
      getPosts("articles", 1, 4).catch(() => null),
      getFeaturedPosts("ideas", 4).catch(() => null),
    ]);

    if (categoriesData && categoriesData.items && categoriesData.items.length > 0) {
      categoryItems = categoriesData.items as Category[];
    }
    if (articlesData && articlesData.items && articlesData.items.length > 0) {
      articleItems = articlesData.items as ApiData<PostShortResponse>[];
    }
    if (thoughtsData && thoughtsData.items && thoughtsData.items.length > 0) {
      thoughtItems = thoughtsData.items as ApiData<PostShortResponse>[];
    }
  } catch {
    // 后端未运行或异常时，平滑捕获
  }

  // 2. 优雅 Fallback 到高保真案例展示数据（无需强依赖后端即可完美呈现设计图）
  if (categoryItems.length === 0) {
    categoryItems = MOCK_FEATURED_COLLECTIONS;
  }
  if (articleItems.length === 0) {
    articleItems = MOCK_LATEST_ARTICLES;
  }
  if (thoughtItems.length === 0) {
    thoughtItems = MOCK_THOUGHTS;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero 区域：数字花园非对称左右分栏 + 原生 3D 天体公转展台 */}
      <HeroSection />

      {/* 2. 核心内容区域 */}
      <div className="container mx-auto px-4 md:px-6 py-10 md:py-16 space-y-16 md:space-y-20">
        {/* 板块 A：3 列专栏合集卡片（带 3D 物理倾斜与聚光） */}
        <FeaturedCategoriesSection categories={categoryItems} />

        {/* 板块 B：设计图核心双栏架构（左侧最新文章列表 + 右侧单篇即时想法） */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pt-2">
          {/* 左侧：最新长文列表 (占 7 列) */}
          <div className="lg:col-span-7">
            <LatestArticlesSection articles={articleItems} />
          </div>

          {/* 右侧：最新想法随笔 (占 5 列，独立单篇即读流) */}
          <div className="lg:col-span-5">
            <ThoughtsSection posts={thoughtItems} />
          </div>
        </div>

        {/* 板块 C：首页专属收官模块（取缔繁琐页脚，打造自然连接与愿景） */}
        <div className="pt-4">
          <ConnectSection />
        </div>
      </div>
    </div>
  );
}
