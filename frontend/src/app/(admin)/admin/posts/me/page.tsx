"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyPosts } from "@/shared/api/generated";
import { PostListTable } from "@/components/admin/posts/post-list-table";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function MyPostsPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "posts", "me"],
    queryFn: () => getMyPosts({ throwOnError: true }),
  });

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
        onDelete={(id) => {
          // TODO: Implement delete logic
          console.log("Delete post:", id);
        }}
      />
    </div>
  );
}
