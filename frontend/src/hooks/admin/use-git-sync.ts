"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyPosts, pushToGit, triggerSync, previewSync } from "@/shared/api";
import {
  MyPostList,
  SyncStatus as DomainSyncStatus,
  SyncPreview,
} from "@/shared/api/types";
import { toast } from "sonner";
import React from "react";
import { usePostMutations } from "./posts/mutations";

/**
 * 🔄 Git 同步与运维核心 Hook
 * 管理 Git 状态、手动同步触发以及数据库反向推送
 * 遵循“全驼峰业务逻辑 + 自动化 API 转换”规范
 */
export function useGitSync() {
  const queryClient = useQueryClient();
  const queryKey = ["admin", "posts", "sync"];

  // 1. 获取所有文章以计算同步状态
  const query = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      const res = await getMyPosts({ throwOnError: true });
      return res.data as unknown as MyPostList;
    },
  });

  // 1.5 获取预览状态 (Pending changes)
  const previewQuery = useQuery({
    queryKey: ["admin", "posts", "sync-preview"],
    queryFn: async () => {
      const res = await previewSync({ throwOnError: true });
      return res.data as unknown as SyncPreview;
    },
    refetchInterval: 60000, // 每 60 秒自动刷新预览
  });

  const refetchWithFeedback = async () => {
    try {
      const promise = query.refetch();
      toast.promise(promise, {
        loading: "正在同步最新 Git 状态...",
        success: "状态已刷新",
        error: "请求失败",
      });
      await promise;
    } catch {
      /* 静默处理 */
    }
  };

  // 辅助计算：区分 Git 托管文章与数据库原生文章
  const allPosts = query.data?.items || [];
  const gitManagedPosts = allPosts.filter((post) => !!post.sourcePath);
  const dbOnlyPosts = allPosts.filter((post) => !post.sourcePath);

  /**
   * 触发手动同步 (Git -> DB)
   */
  const syncMutation = useMutation({
    mutationFn: (forceFull: boolean = false) =>
      triggerSync({
        query: { force_full: forceFull },
        throwOnError: true,
      }),
    onSuccess: (response) => {
      const stats = response.data as unknown as DomainSyncStatus;
      if (!stats) return;

      toast.success("Git 同步完成", {
        description: React.createElement(
          "div",
          { className: "mt-2 space-y-1 text-sm" },
          [
            React.createElement(
              "p",
              { className: "text-success", key: "added" },
              `✨ 新增: ${stats.added?.length ?? 0} 篇`,
            ),
            React.createElement(
              "p",
              { className: "text-info", key: "updated" },
              `📝 更新: ${stats.updated?.length ?? 0} 篇`,
            ),
            React.createElement(
              "p",
              { className: "text-destructive", key: "deleted" },
              `🗑️ 删除: ${stats.deleted?.length ?? 0} 篇`,
            ),
            React.createElement(
              "p",
              {
                className: "text-xs text-muted-foreground pt-1",
                key: "duration",
              },
              `耗时: ${stats.duration?.toFixed(2) ?? "0.00"}秒`,
            ),
          ],
        ),
      });

      if (stats.errors && stats.errors.length > 0) {
        toast.warning(`同步过程中出现 ${stats.errors.length} 个警告`, {
          description: "请查看服务器日志获取详情",
        });
      }

      queryClient.invalidateQueries({ queryKey });
      // 刷新预览状态和文章列表
      queryClient.invalidateQueries({
        queryKey: ["admin", "posts", "sync-preview"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
    },
    onError: (error: Error) => {
      toast.error("同步失败", {
        description: error.message || "请检查后端 Git 配置",
      });
    },
  });

  /**
   * 触发反向推送 (DB -> Git)
   */
  const pushMutation = useMutation({
    mutationFn: () => pushToGit({ throwOnError: true }),
    onSuccess: (response) => {
      const stats = response.data as unknown as DomainSyncStatus;
      if (!stats) return;

      toast.success("数据库导出已启动", {
        description: React.createElement(
          "div",
          { className: "mt-2 space-y-1 text-sm" },
          [
            React.createElement(
              "p",
              { className: "text-primary", key: "exported" },
              `📊 导出: ${stats.updated?.length ?? 0} 篇`,
            ),
            React.createElement(
              "p",
              { className: "text-xs text-muted-foreground pt-1", key: "hint" },
              "这些文章现在已转化为 MDX 文件并受 Git 管辖。",
            ),
          ],
        ),
      });
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: ["admin", "posts", "sync-preview"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
    },
    onError: (error: Error) => {
      toast.error("导出失败", {
        description: error.message || "请确认您有管理员权限",
      });
    },
  });

  const { deletePost } = usePostMutations();

  return {
    ...query,
    posts: allPosts,
    gitManagedPosts,
    dbOnlyPosts,
    preview: previewQuery.data,
    isPreviewLoading: previewQuery.isLoading,
    refetch: async () => {
      await Promise.all([refetchWithFeedback(), previewQuery.refetch()]);
    },
    syncMutation,
    pushMutation,
    deletePost,
  };
}
