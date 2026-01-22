"use client";

import React from "react";
import { useMyPosts, useDeletePost } from "@/shared/hooks/use-posts";
import { usePostTypes } from "@/shared/hooks/use-post-types";
import { PostListTable } from "@/components/admin/posts/post-list-table";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { PostType } from "@/shared/api/generated";
import { toast } from "sonner";

export default function MyPostsPage() {
  const { data: postTypes = [] } = usePostTypes();
  const [activeTab, setActiveTab] = React.useState<PostType | "">("");
  // 1. 确定当前真正的选中项（如果没选，默认用列表第一个）
  const currentTab = (activeTab ||
    postTypes[0]?.value ||
    "article") as PostType;

  const {
    data: posts = [],
    isLoading,
    refetch,
    isFetching,
  } = useMyPosts(currentTab);

  const deleteMutation = useDeletePost();

  // 自动获取当前类型的中文名字 (例如：从后端拿到的 "文章")
  const typeLabel =
    postTypes.find((t) => t.value === currentTab)?.label || "内容";

  // 增强刷新反馈
  const handleRefresh = async () => {
    toast.promise(refetch(), {
      loading: "正在刷新内容...",
      success: {
        message: "刷新成功",
        duration: 1000,
      },
      error: {
        message: "刷新失败，请稍后再试",
        duration: 3000, // 错误信息保留长一点，方便用户看清
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">我的{typeLabel}</h1>
          <p className="text-muted-foreground">管理你创作的所有内容。</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            刷新
          </Button>
          <Button size="sm" asChild>
            <Link href={`/admin/posts/new?type=${currentTab}`}>
              <Plus className="mr-2 h-4 w-4" /> 新建{typeLabel}
            </Link>
          </Button>
        </div>
      </div>

      <Tabs
        value={currentTab}
        onValueChange={(v) => setActiveTab(v as PostType)}
      >
        <TabsList className="bg-muted/50 p-1">
          {postTypes.map((type) => (
            <TabsTrigger
              key={type.value}
              value={type.value}
              className="data-[state=active]:bg-background data-[state=active]:shadow"
            >
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <PostListTable
            posts={posts}
            isLoading={isLoading}
            onDelete={(post) =>
              deleteMutation.mutate({
                id: post.id,
                type: post.postType ?? activeTab,
              })
            }
          />
        </div>
      </Tabs>
    </div>
  );
}
