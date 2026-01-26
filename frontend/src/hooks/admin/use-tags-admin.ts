"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listTags,
  updateTag,
  mergeTags,
  deleteOrphanedTags,
} from "@/shared/api";
import {
  TagList,
  TagFilters,
  TagUpdate as DomainTagUpdate,
  TagMergePayload as DomainTagMergePayload,
} from "@/shared/api/types";
import type {
  ListTagsData,
  UpdateTagData,
  MergeTagsData,
} from "@/shared/api/generated/types.gen";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

/**
 * 后台标签管理 Hook
 * 遵循“全驼峰业务逻辑 + 自动化 API 转换”规范
 */
export function useTagsAdmin(
  page: number = 1,
  size: number = 50,
  search?: string,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. 获取标签列表
  const query = useQuery({
    queryKey: ["admin", "tags", page, size, search],
    queryFn: async () => {
      const filters: TagFilters = { page, size, search };
      const response = await listTags({
        // ✅ 拦截器已接管转换，此处只需通过类型断言
        query: filters as unknown as ListTagsData["query"],
        throwOnError: true,
      });
      return response.data as unknown as TagList;
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
    } catch {
      // 错误由 toast.promise 统一处理
    }
  };

  /**
   * 更新标签
   */
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: DomainTagUpdate }) =>
      updateTag({
        path: { tag_id: data.id } as unknown as UpdateTagData["path"],
        // ✅ 自动转换 Body，无需 denormalize
        body: data.payload as unknown as UpdateTagData["body"],
        throwOnError: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tags"] });
      toast.success("标签更新成功");
    },
    onError: (err: Error) => toast.error(`更新失败: ${err.message}`),
  });

  /**
   * 清理孤立标签
   */
  const cleanupMutation = useMutation({
    mutationFn: () => deleteOrphanedTags({ throwOnError: true }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tags"] });
      const msg = res.data?.message || "清理完成";
      toast.success(msg);
    },
    onError: (err: Error) => toast.error(`清理失败: ${err.message}`),
  });

  /**
   * 合并标签
   */
  const mergeMutation = useMutation({
    mutationFn: (payload: DomainTagMergePayload) =>
      mergeTags({
        // ✅ 自动转换 Body
        body: payload as unknown as MergeTagsData["body"],
        throwOnError: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tags"] });
      toast.success("标签合并成功");
    },
    onError: (err: Error) => toast.error(`合并失败: ${err.message}`),
  });

  return {
    ...query,
    refetch: refetchWithFeedback,
    updateMutation,
    cleanupMutation,
    mergeMutation,
  };
}
