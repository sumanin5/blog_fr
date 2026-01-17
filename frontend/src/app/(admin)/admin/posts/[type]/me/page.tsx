"use client";

import React from "react";
import { useMyPosts, useDeletePost } from "@/shared/hooks/use-posts";
import { POST_TYPE_LABELS } from "@/shared/constants/posts";
import { PostListTable } from "@/components/admin/posts/post-list-table";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PostType } from "@/shared/api/generated";

export default function MyPostsByTypePage() {
  const params = useParams();
  const postType = (params?.type as PostType) || "article";

  // 使用封装的钩子
  const {
    data: posts = [],
    isLoading,
    refetch,
    isFetching,
  } = useMyPosts(postType);
  const deleteMutation = useDeletePost();

  const typeLabel = POST_TYPE_LABELS[postType] || "内容";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">我的{typeLabel}</h1>
          <p className="text-muted-foreground">管理你创作的所有{typeLabel}。</p>
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
            <Link href={`/admin/posts/${postType}/new`}>
              <Plus className="mr-2 h-4 w-4" /> 新建{typeLabel}
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
            type: post.post_type ?? postType,
          })
        }
      />
    </div>
  );
}
