"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { usePostsAdmin } from "@/hooks/admin/posts";
import { PostEditor } from "@/components/admin/posts/post-editor";
import { CategoryResponse, PostType } from "@/shared/api/generated";

interface CreateViewProps {
  postType: PostType;
  categories: CategoryResponse[];
}

export function CreateView({ postType, categories }: CreateViewProps) {
  const router = useRouter();
  const { createPost, isPending } = usePostsAdmin(postType);

  return (
    <div className="h-full">
      <PostEditor
        postType={postType as "article" | "idea"}
        initialData={{
          title: "",
          slug: "",
          contentMdx: "",
        }}
        onSave={(data) =>
          createPost(
            { type: postType, data },
            { onSuccess: () => router.push("/admin/posts") }
          )
        }
        isSaving={isPending}
      />
    </div>
  );
}
