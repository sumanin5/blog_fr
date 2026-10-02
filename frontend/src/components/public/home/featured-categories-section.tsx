"use client";

import Link from "next/link";
import { ArrowRight, Layers, Layout, Cpu, Code2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Category } from "@/shared/api/types";
import { motion } from "framer-motion";

interface FeaturedCategoriesProps {
  categories: Category[];
}

export function FeaturedCategoriesSection({
  categories,
}: FeaturedCategoriesProps) {
  const items = categories || [];

  return (
    <section className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((category, index) => (
          <GardenCollectionCard
            key={category.id}
            category={category}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * 数字花园风格的合集/专栏卡片 (对齐设计图 3 栏并排卡片)
 */
function GardenCollectionCard({
  category,
  index,
}: {
  category: Category;
  index: number;
}) {
  // 根据不同的分类分配对应的数字花园主题图标
  const renderCategoryIcon = (name: string) => {
    if (name.includes("前端")) {
      return <Code2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
    if (name.includes("工程") || name.includes("实践")) {
      return <Cpu className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
    return <Layout className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Link
        href={`/posts/articles/categories/${category.slug}`}
        className="group block h-full outline-hidden"
      >
        <Card className="relative h-full flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 sm:p-7 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5">
          {/* 1. 顶部：图标 + 专栏名称 + "查看全部 ->" */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
                {renderCategoryIcon(category.name)}
              </div>
              <span className="font-semibold text-base text-foreground tracking-tight">
                {category.name}
              </span>
            </div>

            <div className="inline-flex items-center text-xs font-medium text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              <span>查看全部</span>
              <ArrowRight className="ml-1 w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>

          {/* 2. 中部：专栏核心标题与描述 */}
          <div className="mt-5 space-y-2.5 flex-1">
            <h3 className="text-xl font-bold tracking-tight text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
              {category.name === "系统设计" && "FastAPI 与 Next.js 的边界设计"}
              {category.name === "前端工程" && "从 OpenAPI 到类型安全 SDK"}
              {category.name === "工程实践" && "GitOps 内容同步实践"}
              {!["系统设计", "前端工程", "工程实践"].includes(category.name) && category.name}
            </h3>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3 font-light">
              {category.excerpt || category.description || "探索该专栏下的系统架构与技术思考。"}
            </p>
          </div>

          {/* 3. 底部：日期与微发光透视卡片 */}
          <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>2026-09-28</span>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-sans font-medium text-[11px]">
              <Layers className="w-3.5 h-3.5" />
              <span>{category.postCount ?? 8} 篇连载</span>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
