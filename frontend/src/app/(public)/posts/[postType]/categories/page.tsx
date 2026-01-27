import { serverClient } from "@/lib/server-api-client";
import type { PostType } from "@/shared/api/generated/types.gen";
import { listCategoriesByType } from "@/shared/api/generated/sdk.gen";
import { CategoryCard } from "@/components/category/category-card";
import { HeroWrapper } from "@/components/layout/hero-wrapper";
import { Sparkles } from "lucide-react";
import { CategoryList } from "@/shared/api/types";

// 映射 PostType 到更友好的标题
const TYPE_LABELS: Record<string, string> = {
  articles: "文章分类",
  ideas: "想法分类",
};

export default async function CategoryListPage({
  params,
}: {
  params: Promise<{ postType: string }>;
}) {
  const { postType } = await params;

  // 1. 获取所有分类
  const categoriesRes = await listCategoriesByType({
    client: serverClient,
    path: { post_type: postType as unknown as PostType },
    query: { include_inactive: false },
  });

  // 后端返回的分页数据已由拦截器处理成驼峰，断言为 CategoryList 以确保业务代码 100% 驼峰
  const data = categoriesRes.data as unknown as CategoryList;
  const categories = data?.items || [];
  const activeCategories = categories.filter((c) => c.isActive !== false);

  if (activeCategories.length === 0) {
    return (
      <HeroWrapper>
        <div className="container py-40 flex flex-col items-center justify-center text-center max-w-5xl mx-auto">
          <div className="bg-muted/10 p-8 rounded-full mb-6 backdrop-blur-md border border-white/10 shadow-xl">
            <span className="text-5xl">📂</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">暂无分类</h1>
          <p className="text-muted-foreground text-lg">
            该板块下暂时还没有创建任何分类。
          </p>
        </div>
      </HeroWrapper>
    );
  }

  return (
    <HeroWrapper>
      <section className="relative overflow-hidden pt-20 pb-10 lg:pt-32 lg:pb-20 text-center">
        <div className="container mx-auto px-4">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-sm font-medium backdrop-blur-sm shadow-sm">
            <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
            <span className="bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-300 dark:to-purple-300 font-bold">
              {TYPE_LABELS[postType] || "全部分类"}
            </span>
          </div>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground md:text-6xl lg:text-7xl">
            发现
            <span className="mx-2 bg-linear-to-r from-teal-500 via-emerald-500 to-green-500 bg-clip-text text-transparent">
              {activeCategories.length} 个
            </span>
            精彩主题
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl font-medium leading-relaxed">
            探索精心整理的知识体系，发现更多灵感与见解。
          </p>
        </div>
      </section>

      {/* 分割线 */}
      <div className="h-px w-full bg-linear-to-r from-transparent via-border/50 to-transparent mb-12" />

      <div className="container px-4 mx-auto pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {activeCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              postType={postType}
            />
          ))}
        </div>
      </div>
    </HeroWrapper>
  );
}
