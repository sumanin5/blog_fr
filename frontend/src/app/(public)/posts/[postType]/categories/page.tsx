import { normalizeApiResponse } from "@/shared/api/transformers";
import { serverClient } from "@/lib/server-api-client";
import type { PostType } from "@/shared/api/generated/types.gen";
import { listCategoriesByType } from "@/shared/api/generated/sdk.gen";
import { CategoryCard } from "@/components/public/category/category-card";
import { PageHeader } from "@/components/public/common/page-header";
import type { Category } from "@/shared/api/types";

// 映射 PostType 到温润专业的中文专题地图文案
const HEADER_CONFIG: Record<
  string,
  {
    tagline: string;
    title: string;
    subtitle: string;
    description: (count: number) => string;
  }
> = {
  articles: {
    tagline: "数字花园 · 专题体系",
    title: "专栏与",
    subtitle: "专题地图",
    description: (count) =>
      `探索精心凝练的 ${count} 个体系化专栏合集。从底层架构设计到全栈工程，所有知识均以系列专栏深度呈现。`,
  },
  ideas: {
    tagline: "灵感坐标 · 领域标签",
    title: "领域与",
    subtitle: "灵感维度",
    description: (count) =>
      `覆盖 ${count} 个维度的碎片随想。在这里按领域探索即时沉淀的灵感火花与随笔短思。`,
  },
};

export default async function CategoryListPage({
  params,
}: {
  params: Promise<{ postType: string }>;
}) {
  const { postType } = await params;

  // 1. 获取所有分类
  let activeCategories: Category[] = [];
  try {
    const categoriesRes = await listCategoriesByType({
      client: serverClient,
      path: { post_type: postType as unknown as PostType },
      query: { include_inactive: false },
    });

    const data = normalizeApiResponse(categoriesRes.data);
    const categories = data?.items || [];
    activeCategories = categories.filter((c) => c.isActive !== false);
  } catch (error) {
    console.warn("Failed to fetch categories, falling back to showcase data:", error);
  }

  const config = HEADER_CONFIG[postType] || {
    tagline: "知识体系",
    title: "主题与",
    subtitle: "专栏分类",
    description: (count: number) => `探索 ${count} 个精选分类主题。`,
  };

  return (
    <div className="relative min-h-screen">
      <main className="relative z-10">
        <section className="relative pt-24 pb-12 lg:pt-32 lg:pb-20 text-center container mx-auto px-4 md:px-6">
          <PageHeader
            tagline={config.tagline}
            title={config.title}
            subtitle={config.subtitle}
            description={config.description(activeCategories.length)}
          />
        </section>

        {/* Categories Grid or Empty State */}
        <div className="container px-4 md:px-6 mx-auto pb-32">
          {activeCategories.length === 0 ? (
            <div className="py-20 px-6 rounded-3xl border border-dashed border-border/60 text-center space-y-4 max-w-lg mx-auto bg-card/20 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-xl">
                📂
              </div>
              <h3 className="text-lg font-bold text-foreground">专栏筹备中</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                当前暂未发布公开专栏分类。您可以在管理后台创建专题分类，它将自动呈现于此。
              </p>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {activeCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  postType={postType}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
