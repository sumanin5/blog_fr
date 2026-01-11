"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPostById, updatePostByType } from "@/shared/api/generated";
import { PostEditor } from "@/components/admin/posts/post-editor";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditPostPage({ params }: PageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [postId, setPostId] = React.useState<string>("");

  // 解析 params
  React.useEffect(() => {
    params.then((p) => setPostId(p.id));
  }, [params]);

  // 获取文章数据
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "post", postId],
    queryFn: async () => {
      // 先尝试作为 article 获取
      try {
        const result = await getPostById({
          path: { post_type: "article", post_id: postId },
          throwOnError: true,
        });
        return result.data;
      } catch {
        // 如果失败，尝试作为 idea 获取
        const result = await getPostById({
          path: { post_type: "idea", post_id: postId },
          throwOnError: true,
        });
        return result.data;
      }
    },
    enabled: !!postId,
  });

  // 更新文章
  const updateMutation = useMutation({
    mutationFn: async (formData: {
      title: string;
      slug: string;
      contentMdx: string;
    }) => {
      if (!data) throw new Error("文章数据未加载");

      return updatePostByType({
        path: {
          post_type: (data.post_type || "article") as "article" | "idea",
          post_id: postId,
        },
        body: {
          title: formData.title,
          slug: formData.slug,
          content_mdx: formData.contentMdx,
        },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "post", postId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
      toast.success("文章更新成功");
      router.push("/admin/posts/me");
    },
    onError: (error) => {
      toast.error("更新失败", {
        description: error.message,
      });
    },
  });

  if (isLoading || !postId) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">正在加载文章...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive">加载失败</h2>
          <p className="mt-2 text-muted-foreground">
            {error?.message || "文章不存在或无权访问"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PostEditor
      initialData={{
        title: data.title,
        slug: data.slug,
        contentMdx: data.content_mdx || "",
      }}
      onSave={(formData) => updateMutation.mutate(formData)}
      isSaving={updateMutation.isPending}
    />
  );
}
