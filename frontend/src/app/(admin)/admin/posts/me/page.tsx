"use client";

import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getMyPosts, deletePostByType } from "@/shared/api/generated";
import { PostListTable } from "@/components/admin/posts/post-list-table";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function MyPostsPage() {
  // 从服务器获取我的文章
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "posts", "me"],
    queryFn: () => getMyPosts({ throwOnError: true }),
  });

  // 删除文章
  const deleteMutation = useMutation({
    mutationFn: (variables: { id: string; type: string }) =>
      deletePostByType({
        path: {
          post_type: variables.type as "article" | "idea",
          post_id: variables.id,
        },
        throwOnError: true,
      }),
    onSuccess: () => {
      toast.success("文章已删除");
      refetch();
    },
    onError: (error) => {
      toast.error("删除失败", {
        description: error.message,
      });
    },
  });

  // 文章列表
  const posts = data?.data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">我的文章</h1>
          <p className="text-muted-foreground">管理你创作的所有文章和想法。</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            刷新
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/posts/new">
              <Plus className="mr-2 h-4 w-4" /> 新建文章
            </Link>
          </Button>
        </div>
      </div>

      <PostListTable
        posts={posts}
        isLoading={isLoading}
        onDelete={(post) =>
          deleteMutation.mutate({
            id: post.id,
            type: post.post_type ?? "article",
          })
        }
      />
    </div>
  );
}
