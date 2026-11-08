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
import { PostType } from "@/shared/api/generated";

export default function GitSyncPage() {
  const {
    gitManagedPosts,
    dbOnlyPosts,
    posts,
    isLoading,
    isFetching,
    refetch,
    syncMutation,
    preview,
    deletePost,
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
      label: "当前列表文章",
      value: isLoading ? "..." : posts.length,
      icon: Database,
      color: "text-primary",
      description: "当前分页中的文章数",
    },
    {
      label: "仓库待入库",
      value: isFetching ? "..." : (preview?.gitPendingCount ?? pendingChanges),
      icon: RefreshCw,
      color:
        (preview?.gitPendingCount ?? pendingChanges) > 0
          ? "text-warning"
          : "text-success",
      description: "Git 变更尚未应用至数据库",
    },
    {
      label: "数据库独立文章",
      value: isLoading ? "..." : (preview?.dbOnlyCount ?? dbOnlyPosts.length),
      icon: GitBranch,
      color:
        (preview?.dbOnlyCount ?? dbOnlyPosts.length) > 0
          ? "text-info"
          : "text-muted-foreground",
      description: "仅保存在数据库，不会导出到 Git",
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
            : "本地仓库预览未发现待导入变更",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Git 同步状态</h1>
          <p className="max-w-prose text-muted-foreground">
            Git → 网站单向同步。文章和分类从仓库导入，网站不会回写文件或推送 Git。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

          {/* Git import actions */}
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
                  aria-label="选择同步方式"
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
          <h2 className="text-xl font-semibold">我的 Git 追踪列表（当前页）</h2>
        </div>

        <PostListTable
          posts={gitManagedPosts}
          isLoading={isLoading}
          onDelete={(post) =>
            deletePost({
              id: post.id,
              type: (post.postType as PostType) || "articles",
            })
          }
        />

        {gitManagedPosts.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-info/20 bg-info/5 p-4 text-sm text-info">
            <AlertCircle className="size-4 shrink-0" />
            <p className="max-w-prose">
              上方列出的文章源自本地 MDX 文件。任何在后台 UI
              进行的修改，在下次同步时都可能被 Git
              源内容覆盖；后台删除也不会删除源文件，全量同步时可能重新导入。建议在 Git 中修改或删除源文件。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
