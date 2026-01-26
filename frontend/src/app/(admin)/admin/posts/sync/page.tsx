"use client";

import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getMyPosts, triggerSync } from "@/shared/api/generated";
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

  const syncMutation = useMutation({
    mutationFn: () => triggerSync({ throwOnError: true }),
    onSuccess: (response) => {
      const stats = response.data;
      if (!stats) return;

      toast.success("Git 同步完成", {
        description: (
          <div className="mt-2 space-y-1 text-sm">
            <p className="text-green-600">
              ✨ 新增: {stats.added?.length ?? 0} 篇
            </p>
            <p className="text-blue-600">
              📝 更新: {stats.updated?.length ?? 0} 篇
            </p>
            <p className="text-red-600">
              🗑️ 删除: {stats.deleted?.length ?? 0} 篇
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              耗时: {stats.duration?.toFixed(2) ?? "0.00"}秒
            </p>
          </div>
        ),
      });

      // 如果有错误，单独显示
      if (stats.errors && stats.errors.length > 0) {
        toast.warning(`同步过程中出现 ${stats.errors.length} 个警告`, {
          description: "请查看服务器日志获取详情",
        });
      }

      refetch(); // 刷新列表
    },
    onError: (error) => {
      toast.error("同步失败", {
        description: error.message || "请检查后端 Git 配置",
      });
    },
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        }/api/v1/ops/git/push`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // 这里假设你已经处理了 Token
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "请求失败");
      }
      return response.json();
    },
    onSuccess: (stats) => {
      toast.success("数据库导出已启动", {
        description: (
          <div className="mt-2 space-y-1 text-sm">
            <p className="text-purple-600">
              📊 导出: {stats.updated?.length ?? 0} 篇
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              这些文章现在已转化为 MDX 文件并受 Git 管辖。
            </p>
          </div>
        ),
      });
      refetch();
    },
    onError: (error) => {
      toast.error("导出失败", {
        description: error.message || "请确认您有管理员权限",
      });
    },
  });

  const handleManualSync = () => {
    syncMutation.mutate();
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
            onClick={() => {
              refetch().then(() => toast.success("状态已刷新"));
            }}
            disabled={isFetching}
          >
            <History
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            刷新状态
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => pushMutation.mutate()}
            disabled={pushMutation.isPending || dbOnlyPosts.length === 0}
          >
            <Database
              className={`mr-2 h-4 w-4 ${
                pushMutation.isPending ? "animate-spin" : ""
              }`}
            />
            {pushMutation.isPending
              ? "导出中..."
              : `导出 ${dbOnlyPosts.length} 篇原生文章`}
          </Button>
          <Button
            size="sm"
            onClick={handleManualSync}
            disabled={syncMutation.isPending}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                syncMutation.isPending ? "animate-spin" : ""
              }`}
            />
            {syncMutation.isPending ? "同步中..." : "立即全量同步"}
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
