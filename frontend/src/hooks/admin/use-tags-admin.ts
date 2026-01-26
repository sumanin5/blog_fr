"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listTags,
  updateTag,
  mergeTags,
  deleteOrphanedTags,
} from "@/shared/api/generated";
import { denormalizeApiRequest } from "@/shared/api/transformers";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export function useTagsAdmin(
  page: number = 1,
  size: number = 50,
  search?: string
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. 获取标签列表
  const query = useQuery({
    queryKey: ["admin", "tags", page, size, search],
    queryFn: async () => {
      const response = await listTags({
        query: denormalizeApiRequest({ page, size, search }),
        throwOnError: true,
      });
      return response.data;
    },
    enabled:
      !!user?.role && (user.role === "admin" || user.role === "superadmin"),
  });

  // 封装高反馈的刷新函数
  const refetchWithFeedback = async () => {
    try {
      const promise = query.refetch();
      toast.promise(promise, {
        loading: "正在同步最新标签数据...",
        success: "数据已是最新状态",
        error: "同步失败，请检查网络",
      });
      await promise;
    } catch (e) {
      // 这里的错误会被 toast.promise 捕获
    }
  };

  const updateMutation = useMutation({
    mutationFn: (data: {
      id: string;
      name: string;
      slug: string;
      color?: string;
    }) =>
      updateTag({
        path: { tag_id: data.id },
        body: { name: data.name, slug: data.slug, color: data.color },
        throwOnError: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tags"] });
      toast.success("标签更新成功");
    },
    onError: (err: any) =>
      toast.error("更新失败：" + (err.message || "未知错误")),
  });

  const cleanupMutation = useMutation({
    mutationFn: () => deleteOrphanedTags({ throwOnError: true }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tags"] });
      const msg = res.data?.message || "清理完成";
      toast.success(msg);
    },
    onError: (err: any) =>
      toast.error("清理失败：" + (err.message || "未知错误")),
  });

  const mergeMutation = useMutation({
    mutationFn: (data: { sourceTagId: string; targetTagId: string }) =>
      mergeTags({
        body: denormalizeApiRequest(data),
        throwOnError: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tags"] });
      toast.success("标签合并成功");
    },
    onError: (err: any) =>
      toast.error("合并失败：" + (err.message || "未知错误")),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: refetchWithFeedback, // 导出带反馈的函数
    updateMutation,
    cleanupMutation,
    mergeMutation,
    queryClient,
  };
}
