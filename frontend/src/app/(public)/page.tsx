import { HeroCarousel } from "@/components/home/hero-carousel";
import { FeaturedCategories } from "@/components/home/featured-categories";
import { LatestContentSections } from "@/components/home/latest-posts";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. 全屏轮播图 (精选文章) */}
      <HeroCarousel />

      {/* 2. 精选分类 (卡片式轮播) */}
      <FeaturedCategories />

      {/* 3. 最新内容列表 (配置化渲染) */}
      <LatestContentSections />
    </div>
  );
}
