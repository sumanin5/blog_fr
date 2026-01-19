"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useUpdatePost } from "@/shared/hooks/use-posts";
import {
  PostType,
  CategoryResponse,
  PostDetailResponse,
  TagResponse,
} from "@/shared/api/generated";
import { PostEditor } from "@/components/admin/posts/post-editor";

interface EditViewProps {
  post: PostDetailResponse;
  postType: PostType;
  categories: CategoryResponse[];
  tags: TagResponse[];
}

export function EditView({ post, postType, categories, tags }: EditViewProps) {
  const router = useRouter();
  const mutation = useUpdatePost(post.id, postType);

  // 成功后跳转逻辑
  React.useEffect(() => {
    if (mutation.isSuccess) {
      router.push(`/admin/posts/${postType}/me`);
    }
  }, [mutation.isSuccess, router, postType]);

  return (
    <div className="h-full">
      <PostEditor
        postType={postType as "article" | "idea"}
        initialData={{
          title: post.title,
          slug: post.slug,
          contentMdx: post.content_mdx || "",
          coverMedia: post.cover_media,
          categoryId: post.category?.id,
          tags: post.tags?.map((t) => t.name) || [], // 提取标签名
          useServerRendering: post.use_server_rendering,
          enableJsx: post.enable_jsx,
          excerpt: post.excerpt,
          status: post.status,
          isFeatured: post.is_featured,
        }}
        categories={categories}
        tags={tags}
        onSave={(updated) => mutation.mutate(updated)}
        isSaving={mutation.isPending}
      />
    </div>
  );
}
