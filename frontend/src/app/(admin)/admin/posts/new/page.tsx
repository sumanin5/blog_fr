"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCategoriesQuery } from "@/hooks/admin/categories/queries";
import { usePostsAdmin } from "@/hooks/admin/posts";
import { PostEditor } from "@/components/admin/posts/post-editor";
import { PostType } from "@/shared/api/generated";
import { Loader2 } from "lucide-react";

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
            { type: postType, data: data as any },
            { onSuccess: () => router.push("/admin/posts") },
          )
        }
        isSaving={isCreating}
      />
    </div>
  );
}
