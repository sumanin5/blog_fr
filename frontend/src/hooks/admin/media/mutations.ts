"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  uploadFile,
  deleteFile,
  updateFile,
  batchDeleteFiles,
  regenerateThumbnails,
} from "@/shared/api";
import { toast } from "sonner";
import { mediaKeys } from "./constants";
import type {
  MediaUploadPayload,
  MediaUpdatePayload,
  MediaBatchDelete,
} from "@/shared/api/types";
import type {
  UploadFileData,
  UpdateFileData,
  DeleteFileData,
  BatchDeleteFilesData,
  RegenerateThumbnailsData,
} from "@/shared/api/generated/types.gen";
import { toSnakeCase } from "@/shared/api/helpers";

/**
 * 上传文件 Mutation
 */
export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    // ✅ 拦截器自动转换 camelCase -> snake_case
    mutationFn: async (payload: MediaUploadPayload) => {
      const snakeCasePayload = toSnakeCase(payload);
      const response = await uploadFile({
        body: snakeCasePayload as unknown as UploadFileData["body"],
        throwOnError: true,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mediaKeys.stats() });
      toast.success("资源上传成功");
    },
    onError: (err: Error) => toast.error(`上传失败: ${err.message}`),
  });
}

/**
 * 更新文件元数据 Mutation
 */
export function useUpdateFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      fileId,
      payload,
    }: {
      fileId: string;
      payload: MediaUpdatePayload;
    }) => {
      const snakeCasePayload = toSnakeCase(payload);
      const result = await updateFile({
        path: { file_id: fileId } as unknown as UpdateFileData["path"],
        body: snakeCasePayload as unknown as UpdateFileData["body"],
        throwOnError: true,
      });
      return result.data;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.detail(v.fileId) });
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      toast.success("信息更新成功");
    },
    onError: (err: Error) => toast.error(`更新失败: ${err.message}`),
  });
}

/**
 * 重新生成缩略图 Mutation
 */
export function useRegenerateThumbnails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await regenerateThumbnails({
        path: { file_id: id } as unknown as RegenerateThumbnailsData["path"],
        throwOnError: true,
      });
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["media", "blob", id] });
      toast.success("缩略图已触发重绘");
    },
    onError: (err: Error) => toast.error(`重绘失败: ${err.message}`),
  });
}

/**
 * 删除文件 Mutation
 */
export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteFile({
        path: { file_id: id } as unknown as DeleteFileData["path"],
        throwOnError: true,
      });
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mediaKeys.stats() });
      toast.success("资源已永久移除");
    },
    onError: (err: Error) => toast.error(`删除失败: ${err.message}`),
  });
}

/**
 * 批量删除文件 Mutation
 */
export function useBatchDeleteFiles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MediaBatchDelete) => {
      const res = await batchDeleteFiles({
        // ✅ 拦截器自动转换
        body: payload as unknown as BatchDeleteFilesData["body"],
        throwOnError: true,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mediaKeys.stats() });
      toast.success("批量清理完成");
    },
    onError: (err: Error) => toast.error(`批量操作失败: ${err.message}`),
  });
}
