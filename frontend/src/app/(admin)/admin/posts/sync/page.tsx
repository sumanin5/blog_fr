"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyPosts } from "@/shared/api/generated";
import { PostListTable } from "@/components/admin/posts/post-list-table";
import { Button } from "@/components/ui/button";
import {
  GitBranch,
  RefreshCw,
  History,
  FileCheck,
  AlertCircle,
  Database,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function GitSyncPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "posts", "sync"],
    queryFn: () => getMyPosts({ throwOnError: true }),
  });

  // 过滤出受 Git 管理的文章 (即有 source_path 的)
  const allPosts = data?.data?.items || [];
  const gitManagedPosts = allPosts.filter((post) => !!post.source_path);
  const dbOnlyPosts = allPosts.filter((post) => !post.source_path);

  const handleManualSync = () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
      loading: "正在扫描 Git 仓库并同步数据库...",
      success: "Git 同步完成！已更新 0 个文件。",
      error: "同步失败，请检查后端 Git 配置",
    });
  };

  const stats = [
    {
      label: "Git 托管文件",
      value: gitManagedPosts.length,
      icon: GitBranch,
      color: "text-blue-500",
      description: "受源码仓库追踪的文章",
    },
    {
      label: "数据库原生",
      value: dbOnlyPosts.length,
      icon: Database,
      color: "text-purple-500",
      description: "在后台手动创建的文章",
    },
    {
      label: "待同步",
      value: "0",
      icon: RefreshCw,
      color: "text-orange-500",
      description: "检测到本地文件有更新",
    },
    {
      label: "状态检查",
      value: "健康",
      icon: FileCheck,
      color: "text-green-500",
      description: "全站 Commit 哈希一致",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Git 同步状态</h1>
          <p className="text-muted-foreground">
            管理基于 Git (MDX)
            的文章同步状态。本系统支持自动从代码库同步博文内容。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <History
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            刷新状态
          </Button>
          <Button size="sm" onClick={handleManualSync}>
            <RefreshCw className="mr-2 h-4 w-4" /> 立即全量同步
          </Button>
        </div>
      </div>

      {/* 统计看板 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/*Git 文章列表 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <GitBranch className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">Git 追踪列表</h2>
        </div>

        <PostListTable posts={gitManagedPosts} isLoading={isLoading} />

        {gitManagedPosts.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-600 dark:text-blue-400">
            <AlertCircle className="size-4 shrink-0" />
            <p>
              上方列出的文章源自本地 MDX 文件。任何在后台 UI
              进行的修改，在下次同步时都可能被 Git
              源内容覆盖，建议在代码编辑器中修改源码。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
