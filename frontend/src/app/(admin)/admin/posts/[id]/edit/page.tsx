"use client";

import React from "react";
import { useRouter, notFound } from "next/navigation";
import { usePostAdmin } from "@/hooks/admin/posts";
import { useCategoriesQuery } from "@/hooks/admin/categories/queries";
import { Loader2 } from "lucide-react";
import { PostType } from "@/shared/api/generated";
import { PostEditor } from "@/components/admin/posts/post-editor";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditPostPage({ params }: PageProps) {
  const router = useRouter();
  // Unwrap params using React.use for client component compatibility
  const { id } = React.use(params);

  // 1. 使用超级 Hook 获取文章详情与操作方法
  const {
    post,
    update,
    isLoading: isPostLoading,
    isSaving,
    error,
  } = usePostAdmin(id);

  // 2. 获取分类列表 (依赖 postType)
  const normalizedType = (post?.postType as PostType) || "articles";

  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useCategoriesQuery(normalizedType, !!post?.postType);

  if (isPostLoading || isCategoriesLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !post) {
    notFound();
  }

  const categories = categoriesData?.items || [];

  return (
    <div className="h-full">
      <PostEditor
        postType={normalizedType}
        categories={categories}
        initialData={{
          title: post.title,
          slug: post.slug || "",
          contentMdx: post.contentMdx || "",
          coverMedia: post.coverMedia,
          categoryId: post.category?.id,
          status: post.status,
          // Tags 需要从对象数组转为字符串数组
          tags: post.tags?.map((t: any) => t.name) || [],
          excerpt: post.excerpt,
          isFeatured: post.isFeatured,
          enableJsx: post.enableJsx,
          useServerRendering: post.useServerRendering,
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          metaKeywords: post.metaKeywords,
        }}
        onSave={(data) =>
          update(data).then(() => {
            // 保存成功后的逻辑，通常 Stay on page 或者跳转
            // 这里选择跳转回列表，或者您可以选择留在当前页并弹出 Toast (update 内部已经有 Toast 了)
            router.push("/admin/posts");
          })
        }
        isSaving={isSaving}
      />
    </div>
  );
}
