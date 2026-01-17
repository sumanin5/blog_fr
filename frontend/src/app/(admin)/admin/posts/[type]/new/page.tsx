"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useCreatePost } from "@/shared/hooks/use-posts";
import { PostEditor } from "@/components/admin/posts/post-editor";
import { PostType } from "@/shared/api/generated";

export default function NewPostByTypePage() {
  const router = useRouter();
  const params = useParams();
  const postType = (params?.type as PostType) || "article";

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
        onSave={(data) => mutation.mutate(data)}
        isSaving={mutation.isPending}
      />
    </div>
  );
}
