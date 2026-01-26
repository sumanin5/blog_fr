"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { usePostsAdmin } from "@/hooks/admin/posts";
import { PostEditor } from "@/components/admin/posts/post-editor";
import { listCategoriesByType, PostType } from "@/shared/api/generated";
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

  // Fetch categories on client side
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["admin", "categories", postType],
    queryFn: async () => {
      const res = await listCategoriesByType({
        path: { post_type: postType },
        query: { include_inactive: true },
      });
      return res.data?.items || [];
    },
  });

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
            { type: postType, data },
            { onSuccess: () => router.push("/admin/posts") },
          )
        }
        isSaving={isCreating}
      />
    </div>
  );
}
