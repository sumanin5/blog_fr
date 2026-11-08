"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCategoriesQuery } from "@/hooks/admin/categories/queries";
import { usePostsAdmin } from "@/hooks/admin/posts";
import { PostEditor } from "@/components/admin/posts/post-editor";
import { PostType } from "@/shared/api/generated";
import type { PostCreate } from "@/shared/api/types";
import { Info, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function NewPostPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawType = searchParams.get("type") || "articles"; // Default to plural

  // Normalize type
  const postType = (
    rawType === "idea" || rawType === "ideas" ? "ideas" : "articles"
  ) as PostType;

  const { createPost, isPending: isCreating } = usePostsAdmin(postType);

  // Fetch categories using the consistent hook
  const { data: categoriesData, isLoading: isLoadingCategories } =
    useCategoriesQuery(postType);

  const categories = categoriesData?.items || [];

  if (isLoadingCategories) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full">
      <Alert className="mb-4">
        <Info />
        <AlertTitle>数据库独立文章</AlertTitle>
        <AlertDescription>
          这里创建的文章只保存在数据库，不会自动导出到 Git。需要进入内容仓库时，请在 Git
          中添加 Markdown/MDX 文件后同步。
        </AlertDescription>
      </Alert>
      <PostEditor
        postType={postType}
        categories={categories}
        initialData={{
          title: "",
          slug: "",
          contentMdx: "",
        }}
        onSave={(data) =>
          createPost(
            { type: postType, data: data as unknown as PostCreate },
            { onSuccess: () => router.push("/admin/posts") },
          )
        }
        isSaving={isCreating}
      />
    </div>
  );
}
