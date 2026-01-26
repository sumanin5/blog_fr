"use client";

import React from "react";
import { usePostDetailQuery } from "@/hooks/admin/posts/queries";
import { useCategoriesQuery } from "@/hooks/admin/categories/queries";
import { EditView } from "./edit-view";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PostType } from "@/shared/api/generated";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditPostPage({ params }: PageProps) {
  // 使用 React.use 解包 params promise
  const { id } = React.use(params);

  // 1. 获取文章详情 (自动嗅探类型)
  const {
    data: post,
    isLoading: isPostLoading,
    error: postError,
  } = usePostDetailQuery(id, true);

  // 2. 获取分类列表 (依赖 postType)
  const postType = post?.postType as PostType | undefined;
  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useCategoriesQuery(postType || "article", !!postType);

  if (isPostLoading || isCategoriesLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (postError || !post) {
    notFound();
  }

  const categories = categoriesData?.items || [];

  return (
    <EditView
      post={post as any} // 这里 EditView 还没改驼峰，暂时 as any
      postType={postType!}
      categories={categories as any}
    />
  );
}
