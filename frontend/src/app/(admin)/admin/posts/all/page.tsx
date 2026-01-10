"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { listPostsByType } from "@/shared/api/generated";
import { PostListTable } from "@/components/admin/posts/post-list-table";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

export default function AllPostsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<"article" | "idea">(
    "article"
  );

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "posts", "all", activeTab],
    queryFn: () =>
      listPostsByType({
        path: { post_type: activeTab },
        query: { status: null }, // Admins should see all statuses
        throwOnError: true,
      }),
  });

  if (user?.role !== "superadmin") {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive opacity-50" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">访问受限</h2>
          <p className="text-muted-foreground">该页面仅供超级管理员访问。</p>
        </div>
      </div>
    );
  }

  const posts = data?.data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">全站文章管理</h1>
          <p className="text-muted-foreground">
            超级管理员可查看和管理全站所有用户的博文。
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          全选刷新
        </Button>
      </div>

      <Tabs
        defaultValue="article"
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "article" | "idea")}
      >
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="article">文章 (Articles)</TabsTrigger>
          <TabsTrigger value="idea">想法 (Ideas)</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <PostListTable
            posts={posts}
            isLoading={isLoading}
            showAuthor={true}
            onDelete={(id) => {
              console.log("Admin delete post:", id);
            }}
          />
        </div>
      </Tabs>
    </div>
  );
}
