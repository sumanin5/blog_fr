"use client";

import React from "react";
import { useMutation } from "@tanstack/react-query";
import { previewPost, PostPreviewResponse } from "@/shared/api/generated";
import { PostContentClient } from "@/components/post/post-content-client";
import { PostContentServer } from "@/components/post/post-content-server";
import { Loader2 } from "lucide-react";

export default function PostPreviewPage() {
  const [previewData, setPreviewData] =
    React.useState<PostPreviewResponse | null>(null);

  const mutation = useMutation({
    mutationFn: (contentMdx: string) =>
      previewPost({
        body: { content_mdx: contentMdx },
        throwOnError: true,
      }),
    onSuccess: (data) => {
      setPreviewData(data.data);
    },
  });

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "MDX_PREVIEW") {
        mutation.mutate(event.data.content);
      }
    };

    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ type: "PREVIEW_READY" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, [mutation]);

  if (!previewData && !mutation.isPending) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground p-8 text-center">
        等待输入 MDX 内容以生成预览...
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen p-4 md:p-8">
      {mutation.isPending && (
        <div className="fixed top-4 right-4 flex items-center gap-2 bg-background/80 backdrop-blur border rounded-full px-3 py-1 text-xs font-medium z-50">
          <Loader2 className="h-3 w-3 animate-spin" />
          正在渲染...
        </div>
      )}

      {previewData && (
        <div className="mx-auto max-w-4xl">
          <PostContentServer html={previewData.content_html} />
        </div>
      )}
    </div>
  );
}
