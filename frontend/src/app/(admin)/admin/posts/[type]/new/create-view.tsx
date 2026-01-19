"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useCreatePost } from "@/shared/hooks/use-posts";
import { PostEditor } from "@/components/admin/posts/post-editor";
import {
  CategoryResponse,
  PostType,
  TagResponse,
} from "@/shared/api/generated";

interface CreateViewProps {
  postType: PostType;
  categories: CategoryResponse[];
  tags: TagResponse[];
}

export function CreateView({ postType, categories, tags }: CreateViewProps) {
  const router = useRouter();
  const mutation = useCreatePost(postType);

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
          title: "",
          slug: "",
          contentMdx: "",
        }}
        categories={categories}
        tags={tags}
        onSave={(data) => mutation.mutate(data)}
        isSaving={mutation.isPending}
      />
    </div>
  );
}
