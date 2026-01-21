"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useUpdatePost } from "@/shared/hooks/use-posts";
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

export function EditView({ post, postType, categories }: EditViewProps) {
  const router = useRouter();
  const mutation = useUpdatePost(post.id, postType);

  React.useEffect(() => {
    if (mutation.isSuccess) {
      router.push("/admin/posts");
    }
  }, [mutation.isSuccess, router]);

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
          tags: post.tags?.map((t) => t.name) || [],
          useServerRendering: post.use_server_rendering,
          enableJsx: post.enable_jsx,
          excerpt: post.excerpt,
          status: post.status,
          isFeatured: post.is_featured,
        }}
        categories={categories}
        onSave={(updated) => mutation.mutate(updated)}
        isSaving={mutation.isPending}
      />
    </div>
  );
}
