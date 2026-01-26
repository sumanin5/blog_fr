import { serverClient } from "@/lib/server-api-client";
import type { PostType } from "@/shared/api/generated/types.gen";
import { listCategoriesByType } from "@/shared/api/generated/sdk.gen";
import { CategoryCard } from "@/components/category/category-card";

// 映射 PostType 到更友好的标题
const TYPE_LABELS: Record<string, string> = {
  article: "文章分类",
  idea: "想法分类",
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
    // 后端默认可能分页，这里我们假设获取第一页默认数量，如果分类很多可能需要处理分页
    query: { include_inactive: false },
  });

  if (categoriesRes.error || !categoriesRes.data) {
    console.error("Failed to fetch categories", categoriesRes.error);
    // 这里如果报错，可以抛出 error 或者显示空状态
  }

  const categories = categoriesRes.data?.items || [];
  // 过滤未启用的 (虽然 query 应该已经过滤了，双重保险)
  const activeCategories = categories.filter((c) => c.is_active !== false);

  if (activeCategories.length === 0) {
    return (
      <div className="container py-20 flex flex-col items-center justify-center text-center max-w-5xl mx-auto">
        <div className="bg-muted/50 p-6 rounded-full mb-4">
          <span className="text-4xl">📂</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">暂无分类</h1>
        <p className="text-muted-foreground">
          该板块下暂时还没有创建任何分类。
        </p>
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-7xl mx-auto">
      <div className="mb-12 text-center md:text-left space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          {TYPE_LABELS[postType] || "全部分类"}
        </h1>
        <p className="text-muted-foreground text-xl max-w-2xl">
          探索 {activeCategories.length} 个精心策划的主题，发现更多灵感与知识。
        </p>
      </div>

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
  );
}
