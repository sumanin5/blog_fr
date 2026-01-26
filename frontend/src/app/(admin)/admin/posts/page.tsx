"use client";

import React from "react";
import { usePostTypes } from "@/hooks/use-post-types";
import { usePostsAdmin } from "@/hooks/admin/posts";
import { AdminActionButton } from "@/components/admin/common/admin-action-button";
import { PostListTable } from "@/components/admin/posts/post-list-table";
import { Plus, RefreshCw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { PostType } from "@/shared/api/generated";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function MyPostsPage() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") as PostType;

  const { data: postTypes = [] } = usePostTypes();
  const [activeTab, setActiveTab] = React.useState<PostType>(
    typeParam ||
      (postTypes.length > 0
        ? (postTypes[0].value as PostType)
        : ("articles" as PostType)),
  );

  // 当后端数据加载完成且没有 URL 参数时，确保选中第一个
  React.useEffect(() => {
    if (
      !typeParam &&
      postTypes.length > 0 &&
      activeTab === ("articles" as PostType)
    ) {
      if (!postTypes.find((t) => t.value === "articles")) {
        setActiveTab(postTypes[0].value as PostType);
      }
    }
  }, [postTypes, typeParam, activeTab]);

  // 当 URL 参数变化时，同步更新 Tab
  React.useEffect(() => {
    if (typeParam && typeParam !== activeTab) {
      setActiveTab(typeParam);
    }
  }, [typeParam, activeTab]);

  // 1. 使用重构后的超级 Hook
  const { posts, isLoading, isFetching, refetch, deletePost } =
    usePostsAdmin(activeTab);

  // 自动获取当前类型的中文名字
  const typeLabel =
    postTypes.find((t) => t.value === activeTab)?.label || "内容";

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
          <AdminActionButton
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isFetching}
            icon={RefreshCw}
          >
            刷新
          </AdminActionButton>
          <Link
            href={{ pathname: "/admin/posts/new", query: { type: activeTab } }}
          >
            <AdminActionButton size="sm" icon={Plus}>
              新建{typeLabel}
            </AdminActionButton>
          </Link>
        </div>
      </div>

      <Tabs
        value={activeTab}
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
            posts={posts as any}
            isLoading={isLoading}
            onDelete={(post) =>
              deletePost({
                id: post.id,
                type: (post.postType as PostType) || activeTab,
              })
            }
          />
        </div>
      </Tabs>
    </div>
  );
}
