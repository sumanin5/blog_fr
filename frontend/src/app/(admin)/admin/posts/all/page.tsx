"use client";

import React from "react";
import { usePostsAdmin } from "@/hooks/admin/posts";
import { AdminActionButton } from "@/components/admin/common/admin-action-button";
import { PostListTable } from "@/components/admin/posts/post-list-table";
import { RefreshCw, ShieldAlert, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { usePostTypes } from "@/hooks/use-posts";
import { PostType } from "@/shared/api/generated";

export default function AllPostsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // 1. 获取动态板块列表
  const { data: postTypes = [], isLoading: typesLoading } = usePostTypes();

  // 2. 初始化 activeTab (默认为第一个板块或 articles)
  const [activeTab, setActiveTab] = React.useState<PostType>("articles");

  // 当板块加载完成后，如果没有选中有效值，默认选中第一个
  React.useEffect(() => {
    if (postTypes.length > 0 && !postTypes.find((t) => t.value === activeTab)) {
      setActiveTab(postTypes[0].value as PostType);
    }
  }, [postTypes, activeTab]);

  // 权限检查：如果不是超级管理员，重定向
  React.useEffect(() => {
    if (!authLoading && user && user.role !== "superadmin") {
      router.push("/admin/dashboard");
    }
  }, [user, authLoading, router]);

  // 3. 使用超级 Hook
  const { posts, isLoading, refetch, isFetching, deletePost } =
    usePostsAdmin(activeTab);

  // 加载中状态 (Auth or Types)
  if (authLoading || typesLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 权限检查
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">全站文章管理</h1>
          <p className="text-muted-foreground">
            超级管理员可查看和管理全站所有用户的博文。
          </p>
        </div>
        <AdminActionButton
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          isLoading={isFetching}
          icon={RefreshCw}
        >
          刷新
        </AdminActionButton>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as PostType)}
      >
        <TabsList className="bg-muted/50 p-1 mb-6 inline-flex h-auto">
          {postTypes.map((type) => (
            <TabsTrigger
              key={type.value}
              value={type.value}
              className="data-[state=active]:bg-background data-[state=active]:shadow px-4"
            >
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <PostListTable
            posts={posts}
            isLoading={isLoading}
            showAuthor={true}
            onDelete={(post) =>
              deletePost({
                id: post.id,
                type: post.postType as PostType,
              })
            }
          />
        </div>
      </Tabs>
    </div>
  );
}
