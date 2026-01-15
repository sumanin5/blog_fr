"use client";

import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { listPostsByType, deletePostByType } from "@/shared/api/generated";
import { PostListTable } from "@/components/admin/posts/post-list-table";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldAlert, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function AllPostsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"article" | "idea">(
    "article"
  );

  // 权限检查：如果不是超级管理员，重定向
  React.useEffect(() => {
    if (!authLoading && user && user.role !== "superadmin") {
      toast.error("权限不足", {
        description: "该页面仅供超级管理员访问",
      });
      router.push("/admin/dashboard");
    }
  }, [user, authLoading, router]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "posts", "all", activeTab],
    queryFn: () =>
      listPostsByType({
        path: { post_type: activeTab },
        query: { status: null }, // Admins should see all statuses
        throwOnError: true,
      }),
    enabled: user?.role === "superadmin", // 只有超级管理员才获取数据
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      deletePostByType({
        path: { post_type: activeTab, post_id: id },
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

  // 加载中状态
  if (authLoading) {
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
          刷新
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
            onDelete={(post) => deleteMutation.mutate(post.id)}
          />
        </div>
      </Tabs>
    </div>
  );
}
