"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { createPostByType, PostType } from "@/shared/api/generated";
import { PostEditor } from "@/components/admin/posts/post-editor";
import { toast } from "sonner";

export default function NewPostPage() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (data: { title: string; slug: string; contentMdx: string }) =>
      createPostByType({
        path: { post_type: "article" as PostType },
        body: {
          title: data.title,
          slug: data.slug || undefined,
          content_mdx: data.contentMdx,
          post_type: "article" as PostType,
          status: "draft",
        },
        throwOnError: true,
      }),
    onSuccess: () => {
      toast.success("文章创建成功！已存为草稿。");
      router.push("/admin/posts/me");
    },
    onError: (error) => {
      toast.error(
        "创建失败：" + (error instanceof Error ? error.message : "未知错误")
      );
    },
  });

  return (
    <div className="h-full">
      <PostEditor
        onSave={(data) => mutation.mutate(data)}
        isSaving={mutation.isPending}
      />
    </div>
  );
}
