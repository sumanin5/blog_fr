import { notFound } from "next/navigation";
import { serverClient } from "@/lib/server-api-client";
import type { PostType } from "@/shared/api/generated/types.gen";
import {
  listCategoriesByType,
  listPostsByType,
} from "@/shared/api/generated/sdk.gen";
import { PostCard } from "@/components/public/post/views/post-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MdxServerRenderer } from "@/components/public/post/content/renderers/mdx-server-renderer";
import { getThumbnailUrl, getMediaUrl } from "@/lib/media-utils";
import { CategoryList } from "@/shared/api/types";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ postType: string; slug: string }>;
}) {
  const { postType, slug } = await params;

  // 1. 获取所有分类以查找当前分类详情
  const categoriesRes = await listCategoriesByType({
    client: serverClient,
    path: { post_type: postType as unknown as PostType },
  });

  if (categoriesRes.error || !categoriesRes.data) {
    console.error("Failed to fetch categories list", categoriesRes.error);
  }

  // 后端返回的分页数据已由拦截器处理成驼峰，断言为 CategoryList
  const data = categoriesRes.data as unknown as CategoryList;
  const category = data?.items?.find((c) => c.slug === slug);

  if (!category) {
    notFound();
  }

  // 2. 获取该分类下的文章
  const postsRes = await listPostsByType({
    client: serverClient,
    path: { post_type: postType as unknown as PostType },
    query: {
      category_id: category.id,
      page: 1,
      size: 50,
    },
  });

  const posts = postsRes.data?.items || [];
  const coverImageUrl = getThumbnailUrl(category.coverMediaId, "xlarge");
  const iconUrl = getMediaUrl(category.iconId);

  return (
    <div className="min-h-screen">
      <div className="container py-8 mx-auto z-10 relative">
        {/* 分类头部：封面 + 标题 */}
        <div className="relative mb-12 flex flex-col gap-6">
          {/* 封面背景层 */}
          {coverImageUrl ? (
            <div className="h-64 md:h-[450px] w-full relative rounded-2xl overflow-hidden group shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImageUrl}
                alt={category.name}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              {/* 遮罩层：提供多重渐变以实现平滑融合 */}
              <div className="absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent" />
            </div>
          ) : (
            // 无封面时的多彩背景
            <div className="h-40 md:h-64 w-full relative bg-linear-to-br from-primary/10 via-background to-accent/20 rounded-2xl shadow-sm" />
          )}

          {/* 内容层：整体居中排列 */}
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-3 mb-4 opacity-80">
              <Badge
                variant="secondary"
                className="px-3 py-0.5 rounded-full font-medium"
              >
                Category
              </Badge>
              {/* 图标（如果有） */}
              {iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={iconUrl}
                  alt={category.name}
                  className="w-10 h-10 object-contain"
                />
              ) : (
                category.iconPreset && (
                  <span className="text-3xl">{category.iconPreset}</span>
                )
              )}
            </div>

            <h1 className="text-4xl md:text-7xl font-bold tracking-tight mb-6 text-foreground drop-shadow-sm">
              {category.name}
            </h1>

            {category.description && (
              <div
                className={cn(
                  "text-lg md:text-xl max-w-4xl text-pretty text-muted-foreground leading-relaxed prose dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1",
                )}
              >
                <MdxServerRenderer
                  mdx={category.description}
                  toc={[]}
                  articleClassName="mx-auto"
                />
              </div>
            )}
          </div>
        </div>

        {/* 文章列表 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">最新文章</h2>
            <span className="text-sm text-muted-foreground">
              {postsRes.data?.total || 0} 篇文章
            </span>
          </div>

          {posts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post as any} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed rounded-xl bg-card/20 backdrop-blur-sm">
              <p>该分类下暂无文章</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
