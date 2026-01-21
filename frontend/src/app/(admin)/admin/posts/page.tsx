"use client";

import React from "react";
import { useMyPosts, useDeletePost } from "@/shared/hooks/use-posts";
import { POST_TYPE_LABELS } from "@/shared/constants/posts";
import { PostListTable } from "@/components/admin/posts/post-list-table";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { PostType } from "@/shared/api/generated";

export default function MyPostsPage() {
  const [activeTab, setActiveTab] = React.useState<PostType>("article");

  const {
    data: posts = [],
    isLoading,
    refetch,
    isFetching,
  } = useMyPosts(activeTab);
  const deleteMutation = useDeletePost();

  const typeLabel = POST_TYPE_LABELS[activeTab] || "内容";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">我的内容</h1>
          <p className="text-muted-foreground">管理你创作的所有内容。</p>
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
            <Link href={`/admin/posts/new?type=${activeTab}`}>
              <Plus className="mr-2 h-4 w-4" /> 新建{typeLabel}
            </Link>
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as PostType)}
      >
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="article">文章 (Articles)</TabsTrigger>
          <TabsTrigger value="idea">想法 (Ideas)</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <PostListTable
            posts={posts}
            isLoading={isLoading}
            onDelete={(post) =>
              deleteMutation.mutate({
                id: post.id,
                type: post.post_type ?? activeTab,
              })
            }
          />
        </div>
      </Tabs>
    </div>
  );
}
