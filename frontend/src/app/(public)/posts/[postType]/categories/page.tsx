import { serverClient } from "@/lib/server-api-client";
import type { PostType } from "@/shared/api/generated/types.gen";
import { listCategoriesByType } from "@/shared/api/generated/sdk.gen";
import { CategoryCard } from "@/components/public/category/category-card";
import { CategoryList } from "@/shared/api/types";
import { PageHeader } from "@/components/public/common/page-header";
import { PageBackground } from "@/components/public/common/page-background";

// 映射 PostType 到更友好的标题
const TYPE_LABELS: Record<string, string> = {
  articles: "The Knowledge",
  ideas: "Soul &",
};

const SUBTITLE_LABELS: Record<string, string> = {
  articles: "Index",
  ideas: "Fragments",
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
      <div className="relative min-h-screen">
        <PageBackground />
        <div className="container py-40 flex flex-col items-center justify-center text-center max-w-5xl mx-auto relative z-10">
          <div className="bg-muted/10 p-8 rounded-full mb-6 backdrop-blur-md border border-white/10 shadow-xl">
            <span className="text-5xl">📂</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">暂无分类</h1>
          <p className="text-muted-foreground text-lg">
            该板块下暂时还没有创建任何分类。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <PageBackground />

      <main className="relative z-10">
        <section className="relative pt-24 pb-12 lg:pt-32 lg:pb-20 text-center container mx-auto px-4 md:px-6">
          <PageHeader
            tagline="topic.scanner — v1.0.4"
            title={TYPE_LABELS[postType] || "Content"}
            subtitle={SUBTITLE_LABELS[postType] || "Categories"}
            description={`探索精心整理的 ${activeCategories.length} 个主题分类。从深度的技术探究到生活中的灵感瞬间，所有知识都在这里井然有序。`}
          />
        </section>

        {/* Categories Grid */}
        <div className="container px-4 md:px-6 mx-auto pb-32">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {activeCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                postType={postType}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
