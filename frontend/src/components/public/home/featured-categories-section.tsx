"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryCard } from "@/components/public/category/category-card";

interface FeaturedCategoriesProps {
  categories: any[];
}

export function FeaturedCategoriesSection({
  categories,
}: FeaturedCategoriesProps) {
  const items = categories || [];

  if (!items.length) {
    return null;
  }

  return (
    <section className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border/50 pb-6 gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">精选分类</h2>
          <p className="text-muted-foreground text-lg font-light">
            按专题探索技术领域。
          </p>
        </div>
        <Link
          href="/posts/articles/categories"
          className="group hidden sm:inline-flex text-sm font-medium text-primary items-center gap-1 hover:text-primary/80 transition-colors"
        >
          查看全部分类{" "}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            postType="articles"
          />
        ))}
      </div>

      <div className="sm:hidden text-center">
        <Link href="/posts/articles/categories">
          <Button variant="outline" className="w-full">
            查看全部分类
          </Button>
        </Link>
      </div>
    </section>
  );
}
