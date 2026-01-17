"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { usePostDetail, useUpdatePost } from "@/shared/hooks/use-posts";
import { PostType } from "@/shared/api/generated";
import { PostEditor } from "@/components/admin/posts/post-editor";
import { Loader2 } from "lucide-react";

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();

  const id = params?.id as string;
  const postType = (params?.type as PostType) || "article";

  // 使用封装的钩子
  const { data: post, isLoading, error } = usePostDetail(id, postType);
  const mutation = useUpdatePost(id, postType);

  // 成功后跳转逻辑
  React.useEffect(() => {
    if (mutation.isSuccess) {
      router.push(`/admin/posts/${postType}/me`);
    }
  }, [mutation.isSuccess, router, postType]);

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center gap-4">
        <p className="text-destructive">获取文章失败</p>
        <button
          onClick={() => router.back()}
          className="text-sm font-medium hover:underline"
        >
          返回上一页
        </button>
      </div>
    );
  }

  return (
    <div className="h-full">
      <PostEditor
        postType={postType as "article" | "idea"}
        initialData={{
          title: post.title,
          slug: post.slug,
          contentMdx: post.content_mdx || "",
          cover_media_id: post.cover_media?.id,
          category_id: post.category?.id,
        }}
        onSave={(updated) => mutation.mutate(updated)}
        isSaving={mutation.isPending}
      />
    </div>
  );
}
