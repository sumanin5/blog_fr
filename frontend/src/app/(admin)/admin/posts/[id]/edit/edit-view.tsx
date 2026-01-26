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
  post: PostDetail;
  postType: PostType;
  categories: CategoryResponse[];
}

export function EditView({ post, postType, categories }: EditViewProps) {
  const router = useRouter();
  const { updatePost, isPending } = usePostsAdmin(postType);

  return (
    <div className="h-full">
      <PostEditor
        postType={postType as "article" | "idea"}
        categories={categories}
        initialData={{
          title: post.title,
          slug: post.slug || "",
          contentMdx: post.contentMdx || "",
          coverMedia: post.coverMedia,
          categoryId: post.category?.id,
          // 需要确保 PostDetail 包含这些字段，如果还是下划线则需要转换
          status: post.status,
          tags: post.tags?.map((t) => t.name) || [],
          excerpt: post.excerpt,
          isFeatured: post.isFeatured,
          enableJsx: post.enableJsx,
          useServerRendering: post.useServerRendering,
        }}
        onSave={(updated) =>
          updatePost(
            // 这里 updatePost 需要的 payload 可能是下划线的？
            // 不，usePostsAdmin -> updatePostByType (generated) 需要 CamelCase (经过拦截器) 或者是 Raw (如果未拦截)
            // 根据之前的经验，input 通常需要自行转为下划线，或者 SDK 会转。
            // 这里我们先假定 updatePost 会处理转换，或者我们手动传 Raw。
            // 实际上 PostEditor 的 onSave 回调出来的 updated 已经是下划线的 (在 PostEditor 内部转换了)
            { id: post.id, data: updated, type: postType },
            { onSuccess: () => router.push("/admin/posts") },
          )
        }
        isSaving={isPending}
      />
    </div>
  );
}
