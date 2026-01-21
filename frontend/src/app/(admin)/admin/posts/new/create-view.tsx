"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useCreatePost } from "@/shared/hooks/use-posts";
import { PostEditor } from "@/components/admin/posts/post-editor";
import { CategoryResponse, PostType } from "@/shared/api/generated";

interface CreateViewProps {
  postType: PostType;
  categories: CategoryResponse[];
}

export function CreateView({ postType, categories }: CreateViewProps) {
  const router = useRouter();
  const mutation = useCreatePost(postType);

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
          title: "",
          slug: "",
          contentMdx: "",
        }}
        categories={categories}
        onSave={(data) => mutation.mutate(data)}
        isSaving={mutation.isPending}
      />
    </div>
  );
}
