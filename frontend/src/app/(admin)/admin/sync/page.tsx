"use client";

import React from "react";
import { useGitSync } from "@/hooks/admin/use-git-sync";
import { PostListTable } from "@/components/admin/posts/post-list-table";
import { AdminActionButton } from "@/components/admin/common/admin-action-button";
import {
  GitBranch,
  RefreshCw,
  History as HistoryIcon,
  FileCheck,
  AlertCircle,
  Database,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function GitSyncPage() {
  const {
    gitManagedPosts,
    dbOnlyPosts,
    posts,
    isLoading,
    isFetching,
    refetch,
    syncMutation,
    pushMutation,
    preview,
  } = useGitSync();

  const handleSync = (forceFull: boolean = false) => {
    syncMutation.mutate(forceFull);
  };

  // 动态计算挂起的变更数
  const pendingChanges =
    (preview?.toUpdate?.length || 0) +
    (preview?.toCreate?.length || 0) +
    (preview?.toDelete?.length || 0);

  const stats = [
    {
      label: "全站博文总数",
      value: isLoading ? "..." : posts.length,
      icon: Database,
      color: "text-primary",
      description: "当前系统内所有文章索引",
    },
    {
      label: "仓库待入库",
      value: isFetching ? "..." : pendingChanges,
      icon: RefreshCw,
      color: pendingChanges > 0 ? "text-warning" : "text-success",
      description: "Git 变更尚未应用至数据库",
    },
    {
      label: "数据库待出库",
      value: isLoading ? "..." : dbOnlyPosts.length,
      icon: GitBranch,
      color: dbOnlyPosts.length > 0 ? "text-info" : "text-muted-foreground",
      description: "本地修改尚未写回 MDX 文件",
    },
    {
      label: "系统状态",
      value: isFetching
        ? "检查中"
        : (preview?.errors?.length || 0) > 0
          ? "异常"
          : pendingChanges > 0
            ? "待同步"
            : "已同步",
      icon: FileCheck,
      color: isFetching
        ? "text-muted-foreground"
        : (preview?.errors?.length || 0) > 0
          ? "text-destructive"
          : pendingChanges > 0
            ? "text-warning"
            : "text-success",
      description:
        (preview?.errors?.length || 0) > 0
          ? `检测到 ${preview?.errors?.length} 个同步冲突`
          : pendingChanges > 0
            ? "Git 变更尚未应用，请点击同步"
            : "数据库与 Git 记录完全对齐",
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
          {/* 刷新按钮 */}
          <AdminActionButton
            variant="outline"
            size="sm"
            icon={HistoryIcon}
            isLoading={isFetching}
            loadingText="刷新中"
            onClick={() => refetch()}
          >
            刷新状态
          </AdminActionButton>

          {/* 导出按钮 */}
          <AdminActionButton
            variant="outline"
            size="sm"
            icon={Database}
            isLoading={pushMutation.isPending}
            loadingText="导出中"
            disabled={dbOnlyPosts.length === 0}
            onClick={() => pushMutation.mutate()}
          >
            导出原生文章
            {dbOnlyPosts.length > 0 && ` (${dbOnlyPosts.length})`}
          </AdminActionButton>

          {/* 同步按钮组 */}
          <div className="flex items-center">
            <AdminActionButton
              size="sm"
              className="rounded-r-none border-r-0"
              icon={RefreshCw}
              isLoading={syncMutation.isPending}
              loadingText="同步中"
              onClick={() => handleSync(false)}
            >
              增量同步
            </AdminActionButton>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="rounded-l-none px-2 h-9 border-l border-primary-foreground/20"
                  disabled={syncMutation.isPending}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleSync(false)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  <span>增量同步 (快速)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSync(true)}>
                  <Database className="mr-2 h-4 w-4" />
                  <span>全量重刷 (修复)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
          <div className="flex items-center gap-2 rounded-lg border border-info/20 bg-info/5 p-4 text-sm text-info">
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
