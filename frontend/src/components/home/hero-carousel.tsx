"use client";

import * as React from "react";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  FolderOpen,
} from "lucide-react";
import { useFeaturedCategories } from "@/hooks/use-featured-categories";
import { getThumbnailUrl, getMediaUrl } from "@/lib/media-utils";
import { type Category } from "@/shared/api/types";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

// --- Mock Data ---
const MOCK_CATEGORIES = [
  {
    id: "mock-1",
    name: "全栈开发",
    slug: "full-stack",
    excerpt:
      "探索现代 Web 开发技术栈，从 React Server Components 到高性能后端架构。",
    cover_image_mock:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2000",
  },
  {
    id: "mock-2",
    name: "人工智能",
    slug: "ai-llm",
    excerpt:
      "深入理解 LLM 原理、Prompt Engineering 以及 AI Agent 在实际业务中的应用。",
    cover_image_mock:
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=2000",
  },
  {
    id: "mock-3",
    name: "数字生活",
    slug: "digital-life",
    excerpt: "分享提升工作效率的工具、方法论以及构建数字花园的思考与实践。",
    cover_image_mock:
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2000",
  },
];

export function HeroCarousel() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  // 1. 使用专用的 Hook 获取数据
  const { data: categoriesData, isLoading } = useFeaturedCategories();

  // 2. 处理数据
  // Hook 返回的已经是 CategoryList，可以直接取 items
  const featuredCategories = categoriesData?.items || [];

  // 3. 决定是否使用 Mock
  // 只有当加载完成且没有数据时才使用 Mock
  const isUsingMock = featuredCategories.length === 0 && !isLoading;
  const slides = isUsingMock ? MOCK_CATEGORIES : featuredCategories;

  React.useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  if (isLoading) {
    return <CarouselSkeleton />;
  }

  // 如果既没 API 数据也没 Mock (理论上不可能)，则不渲染
  if (slides.length === 0) return null;

  return (
    <section className="relative w-full bg-background">
      <Carousel
        setApi={setApi}
        opts={{ loop: true }}
        plugins={[Autoplay({ delay: 6000, stopOnInteraction: false })]}
        className="w-full"
      >
        <CarouselContent className="h-[60vh] min-h-[500px] ml-0">
          {slides.map((cat) => {
            // 类型断言：根据 isUsingMock 区分类型
            const category = cat as Category | (typeof MOCK_CATEGORIES)[number];
            const coverUrl = isUsingMock
              ? (category as (typeof MOCK_CATEGORIES)[number]).cover_image_mock
              : getThumbnailUrl(
                  (category as Category).coverMediaId,
                  "xlarge",
                ) || MOCK_CATEGORIES[0].cover_image_mock;

            const realCategory = !isUsingMock ? (category as Category) : null;
            const iconUrl = getMediaUrl(realCategory?.iconId);

            return (
              <CarouselItem
                key={category.id}
                className="pl-0 h-full w-full basis-full"
              >
                <div className="relative h-full w-full overflow-hidden group">
                  {/* 背景图：使用 absolute inset-0 确保铺满 */}
                  <div className="absolute inset-0 z-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverUrl}
                      alt={category.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {/* 遮罩：适配浅色/深色模式，统一使用深色遮罩保证文字可读性，
                      或者可以使用 from-background/90 来跟随主题 */}
                    <div className="absolute inset-0 bg-black/50 dark:bg-black/70" />
                    <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent" />
                  </div>

                  {/* 内容容器 */}
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center text-white">
                    <div className="max-w-3xl space-y-6 animate-in fade-in zoom-in-95 duration-700">
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary-foreground/90 backdrop-blur-sm border border-primary/20">
                        {iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={iconUrl}
                            alt="icon"
                            className="h-4 w-4 object-contain"
                          />
                        ) : (
                          <FolderOpen className="h-4 w-4" />
                        )}
                        Featured Topic
                      </span>

                      <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl drop-shadow-md text-white">
                        {category.name}
                      </h1>

                      <p className="max-w-xl mx-auto text-lg text-white/80 md:text-xl line-clamp-2">
                        {category.excerpt}
                      </p>

                      <div className="pt-4">
                        <Button
                          asChild
                          size="lg"
                          className="rounded-full text-lg h-12 px-8 shadow-lg"
                        >
                          <Link
                            href={`/posts/articles/categories/${category.slug}`}
                          >
                            浏览专栏 <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {/* 指示器和控制按钮 */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
          {slides.map((_, idx) => (
            <button
              key={idx}
              className={cn(
                "h-2 rounded-full transition-all duration-300 shadow-sm",
                current === idx
                  ? "w-8 bg-primary"
                  : "w-2 bg-primary/30 hover:bg-primary/50",
              )}
              onClick={() => api?.scrollTo(idx)}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/20 text-white hover:bg-background/40 hover:text-white hidden md:flex border-0"
          onClick={() => api?.scrollPrev()}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/20 text-white hover:bg-background/40 hover:text-white hidden md:flex border-0"
          onClick={() => api?.scrollNext()}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      </Carousel>
    </section>
  );
}

function CarouselSkeleton() {
  return <Skeleton className="w-full h-[60vh] min-h-[500px]" />;
}
