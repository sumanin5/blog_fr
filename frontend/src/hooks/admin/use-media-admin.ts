"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllFilesAdmin,
  updateFile,
  deleteFile,
  batchDeleteFiles,
  regenerateThumbnails,
} from "@/shared/api";
import { mediaKeys } from "./media/constants";
import type {
  AdminMediaList,
  AdminMediaFilters,
  MediaUpdatePayload,
  MediaBatchDelete,
  MediaBatchDeleteResult,
} from "@/shared/api/types";
import type {
  GetAllFilesAdminData,
  UpdateFileData,
  DeleteFileData,
  BatchDeleteFilesData,
  RegenerateThumbnailsData,
} from "@/shared/api/generated/types.gen";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

/**
 * 👑 媒体中心管理核心 Hook (Admin Version)
 * 遵循“全驼峰业务逻辑 + 自动化 API 转换”规范
 */
export function useMediaAdmin(filters: AdminMediaFilters = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. 获取全站媒体列表
  const query = useQuery({
    queryKey: mediaKeys.adminList(filters),
    queryFn: async () => {
      const response = await getAllFilesAdmin({
        // ✅ 拦截器已处理转换，不再手动调用 denormalizeApiRequest
        query: filters as unknown as GetAllFilesAdminData["query"],
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
      /* 静默处理 */
    }
  };

  /**
   * 更新文件元数据
   */
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: MediaUpdatePayload }) =>
      updateFile({
        path: { file_id: data.id } as unknown as UpdateFileData["path"],
        // ✅ 依赖拦截器自动处理 camelCase -> snake_case
        body: data.payload as unknown as UpdateFileData["body"],
        throwOnError: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success("资源元数据已更新");
    },
    onError: (err: Error) => toast.error(`更新失败: ${err.message}`),
  });

  /**
   * 删除文件
   */
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      deleteFile({
        path: { file_id: id } as unknown as DeleteFileData["path"],
        throwOnError: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success("资源已永久移除");
    },
    onError: (err: Error) => toast.error(`删除失败: ${err.message}`),
  });

  /**
   * 批量删除
   */
  const batchDeleteMutation = useMutation({
    mutationFn: (payload: MediaBatchDelete) =>
      batchDeleteFiles({
        // ✅ 自动转换 Body
        body: payload as unknown as BatchDeleteFilesData["body"],
        throwOnError: true,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      const data = res.data as unknown as MediaBatchDeleteResult;
      toast.success(`批量清理成功：已移除 ${data?.deletedCount} 个资源`);
    },
    onError: (err: Error) => toast.error(`批量操作失败: ${err.message}`),
  });

  /**
   * 重新生成缩略图
   */
  const regenerateMutation = useMutation({
    mutationFn: (fileId: string) =>
      regenerateThumbnails({
        path: {
          file_id: fileId,
        } as unknown as RegenerateThumbnailsData["path"],
        throwOnError: true,
      }),
    onSuccess: () => {
      toast.success("缩略图已触发后台重新生成");
    },
    onError: (err: Error) => toast.error(`重绘失败: ${err.message}`),
  });

  return {
    ...query,
    refetch: refetchWithFeedback,
    updateMutation,
    deleteMutation,
    batchDeleteMutation,
    regenerateMutation,
  };
}
