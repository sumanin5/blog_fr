"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { usePostsAdmin } from "@/hooks/admin/posts";
import {
  PostType,
  CategoryResponse,
  PostDetailResponse,
} from "@/shared/api/generated";
import { PostEditor } from "@/components/admin/posts/post-editor";

interface EditViewProps {
  post: PostDetailResponse;
  postType: PostType;
  categories: CategoryResponse[];
}

export function EditView({
  post,
  postType,
}: Omit<EditViewProps, "categories">) {
  const router = useRouter();
  const { updatePost, isPending } = usePostsAdmin(postType);

  return (
    <div className="h-full">
      <PostEditor
        postType={postType as "article" | "idea"}
        initialData={{
          title: post.title,
          slug: post.slug || "",
          contentMdx: post.content_mdx || "",
          coverMedia: post.cover_media as any,
          categoryId: post.category?.id,
        }}
        onSave={(updated) =>
          updatePost(
            { id: post.id, data: updated, type: postType },
            { onSuccess: () => router.push("/admin/posts") }
          )
        }
        isSaving={isPending}
      />
    </div>
  );
}
