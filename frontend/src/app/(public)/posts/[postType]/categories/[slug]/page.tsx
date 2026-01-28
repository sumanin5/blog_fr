import { notFound } from "next/navigation";
import { serverClient } from "@/lib/server-api-client";
import type { PostType } from "@/shared/api/generated/types.gen";
import {
  listCategoriesByType,
  listPostsByType,
} from "@/shared/api/generated/sdk.gen";
import { PostCard } from "@/components/post/views/post-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HeroWrapper } from "@/components/layout/hero-wrapper";
import { MdxServerRenderer } from "@/components/post/content/renderers/mdx-server-renderer";
import { getThumbnailUrl, getMediaUrl } from "@/lib/media-utils";

import { Category, CategoryList } from "@/shared/api/types";

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
  // @ts-expect-error: icon is Media ID
  const iconUrl = getMediaUrl(category.icon);

  return (
    <HeroWrapper>
      <div className="container py-8 mx-auto z-10 relative">
        {/* 分类头部：封面 + 标题 */}
        <Card className="relative mb-10 overflow-hidden group p-0 border-0">
          {/* 封面背景层 */}
          {coverImageUrl ? (
            <div className="h-48 md:h-72 w-full relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImageUrl}
                alt={category.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* 遮罩层：从系统背景色向上淡出，融入背景的同时保证文字可读 */}
              <div className="absolute inset-0 bg-linear-to-t from-background/95 via-background/30 to-transparent" />
            </div>
          ) : (
            // 无封面时的多彩背景
            <div className="h-32 md:h-48 w-full relative bg-linear-to-br from-primary/10 via-background to-accent/20" />
          )}

          {/* 内容层 */}
          <div
            className={cn(
              "p-6 md:p-8 flex flex-col justify-end",
              category.coverImage ? "absolute inset-0 text-foreground" : "",
            )}
          >
            <div className="flex items-center gap-3 mb-2 opacity-90">
              <Badge variant="outline" className="border-current">
                Category
              </Badge>
              {/* 图标（如果有） */}
              {iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={iconUrl}
                  alt={category.name}
                  className="w-8 h-8 object-contain"
                />
              ) : (
                category.iconPreset && (
                  <span className="text-lg">{category.iconPreset}</span>
                )
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2 drop-shadow-sm">
              {category.name}
            </h1>

            {category.description && (
              <div
                className={cn(
                  "mt-4 text-base md:text-lg max-w-none text-pretty prose dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1",
                  category.coverImage
                    ? "text-white prose-headings:text-white prose-strong:text-white"
                    : "text-muted-foreground",
                )}
              >
                <MdxServerRenderer
                  mdx={category.description}
                  toc={[]}
                  articleClassName=""
                />
              </div>
            )}
          </div>
        </Card>

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
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed rounded-xl bg-card/50 backdrop-blur-sm">
              <p>该分类下暂无文章</p>
            </div>
          )}
        </div>
      </div>
    </HeroWrapper>
  );
}
