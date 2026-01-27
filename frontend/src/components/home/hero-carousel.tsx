"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { listPostsByType } from "@/shared/api/generated/sdk.gen";
import { PostType } from "@/shared/api/generated/types.gen";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getThumbnailUrl } from "@/lib/media-utils";
import { cn } from "@/lib/utils";

export function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 25 }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 获取精选文章
  const { data: postsData, isLoading } = useQuery({
    queryKey: ["posts", "articles", "featured"],
    queryFn: () =>
      listPostsByType({
        path: { post_type: "articles" },
        query: { is_featured: true, size: 5 },
      }),
  });

  const slides = postsData?.data?.items || [];

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  if (isLoading) {
    return <CarouselSkeleton />;
  }

  if (slides.length === 0) {
    return null; // 如果没有精选文章，不显示轮播
  }

  return (
    <div className="relative group w-full h-[85vh] min-h-[600px] overflow-hidden">
      {/* 轮播主体 */}
      <div className="absolute inset-0 z-0 h-full w-full" ref={emblaRef}>
        <div className="flex h-full w-full touch-pan-y">
          {slides.map((post) => (
            <div
              className="relative min-w-0 flex-[0_0_100%] h-full w-full"
              key={post.id}
            >
              <CarouselSlide post={post} />
            </div>
          ))}
        </div>
      </div>

      {/* 左右导航按钮 (悬停显示) */}
      <div className="absolute inset-x-4 top-1/2 z-20 flex -translate-y-1/2 justify-between opacity-0 transition-opacity duration-300 md:group-hover:opacity-100 pointer-events-none">
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full border-white/20 bg-black/20 text-white backdrop-blur-sm transition-transform hover:scale-110 hover:bg-black/40 pointer-events-auto"
          onClick={scrollPrev}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full border-white/20 bg-black/20 text-white backdrop-blur-sm transition-transform hover:scale-110 hover:bg-black/40 pointer-events-auto"
          onClick={scrollNext}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* 底部指示器 */}
      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              selectedIndex === index
                ? "w-8 bg-primary"
                : "w-2 bg-white/50 hover:bg-white/80",
            )}
            onClick={() => emblaApi?.scrollTo(index)}
          />
        ))}
      </div>
    </div>
  );
}

function CarouselSlide({ post }: { post: any }) {
  const coverUrl = getThumbnailUrl(post.cover_media_id, "xlarge");

  return (
    <div className="relative h-full w-full">
      {/* 背景图片 */}
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={post.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 h-full w-full bg-linear-to-br from-gray-900 to-gray-800" />
      )}

      {/* 渐变遮罩 */}
      <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />
      <div className="absolute inset-0 bg-black/20" />

      {/* 内容区域 */}
      <div className="container relative z-10 flex h-full flex-col justify-end pb-24 md:pb-32">
        <div className="max-w-3xl space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="flex gap-2">
            {post.category && (
              <Badge
                variant="secondary"
                className="bg-primary/20 hover:bg-primary/30 text-primary-foreground backdrop-blur-md border-0"
              >
                {post.category.name}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="text-white border-white/30 backdrop-blur-md"
            >
              {new Date(post.published_at).toLocaleDateString()}
            </Badge>
          </div>

          <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl text-shadow-lg">
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="line-clamp-2 text-lg text-gray-200 md:text-xl max-w-2xl text-shadow-sm">
              {post.excerpt}
            </p>
          )}

          <div className="pt-4">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 text-lg font-medium shadow-lg hover:shadow-primary/50 transition-all duration-300"
            >
              <Link href={`/posts/articles/${post.slug}`}>
                阅读文章 <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CarouselSkeleton() {
  return (
    <div className="w-full h-[500px] md:h-[600px] bg-muted animate-pulse relative">
      <div className="container h-full flex flex-col justify-end pb-24">
        <Skeleton className="h-8 w-24 mb-4" />
        <Skeleton className="h-16 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="h-12 w-40 rounded-full" />
      </div>
    </div>
  );
}
