"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllFilesAdmin,
  updateFile,
  deleteFile,
  batchDeleteFiles,
  regenerateThumbnails,
} from "@/shared/api";
import { denormalizeApiRequest } from "@/shared/api/transformers";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { mediaKeys } from "./media/constants";
import type { AdminMediaList, AdminMediaFilters } from "@/shared/api/types";

/**
 * 👑 媒体中心管理核心 Hook (Admin Version)
 */
export function useMediaAdmin(filters: AdminMediaFilters = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. 获取全站媒体列表
  const query = useQuery({
    queryKey: mediaKeys.adminList(filters),
    queryFn: async () => {
      // 手动转换 query 参数，因为 SDK 的拦截器在 URL 构建后才执行
      const response = await getAllFilesAdmin({
        query: denormalizeApiRequest(filters),
        throwOnError: true,
      });
      return response.data as unknown as AdminMediaList;
    },
    enabled:
      !!user?.role && (user.role === "admin" || user.role === "superadmin"),
  });

  const refetchWithFeedback = async () => {
    try {
      const promise = query.refetch();
      toast.promise(promise, {
        loading: "正在同步最新资源数据...",
        success: "媒体库已更新",
        error: "请求失败，请检查授权",
      });
      await promise;
    } catch {
      /* Silent */
    }
  };

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; originalFilename: string }) =>
      updateFile({
        path: { file_id: data.id },
        body: { original_filename: data.originalFilename },
        throwOnError: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success("资源元数据已更新");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      deleteFile({
        path: { file_id: id },
        throwOnError: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success("资源已永久移除");
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      batchDeleteFiles({
        body: { file_ids: ids },
        throwOnError: true,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success(`批量清理成功：已移除 ${res.data?.deleted_count} 个资源`);
    },
  });

  // 修正：重建缩略图需要 file_id
  const regenerateMutation = useMutation({
    mutationFn: (fileId: string) =>
      regenerateThumbnails({
        path: { file_id: fileId },
        throwOnError: true,
      }),
    onSuccess: () => {
      toast.success("缩略图已触发后台重新生成");
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: refetchWithFeedback,
    updateMutation,
    deleteMutation,
    batchDeleteMutation,
    regenerateMutation,
  };
}
