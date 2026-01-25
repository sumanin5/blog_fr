"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  uploadFile,
  deleteFile,
  updateFile,
  batchDeleteFiles,
  regenerateThumbnails,
  type BodyUploadFile,
  type MediaFileUpdate,
  type BatchDeleteRequest,
} from "@/shared/api";
import { denormalizeApiRequest } from "@/shared/api/transformers";
import { toast } from "sonner";
import { mediaKeys } from "./constants";
import type * as Raw from "@/shared/api/generated/types.gen";
import type {
  MediaUploadPayload,
  MediaUpdatePayload,
  MediaBatchDelete,
} from "@/shared/api/types";

/**
 * 上传文件 Mutation
 */
export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    // 依赖全局拦截器自动处理 camelCase -> snake_case
    mutationFn: async (input: MediaUploadPayload) => {
      const response = await uploadFile({
        body: input as unknown as BodyUploadFile, // 显式断言：Camel -> Unknown -> Snake
        throwOnError: true,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mediaKeys.stats() });
    },
    onError: (err: Error) => toast.error("上传错误：" + err.message),
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
      data,
    }: {
      fileId: string;
      data: MediaUpdatePayload;
    }) => {
      const result = await updateFile({
        path: denormalizeApiRequest<Raw.UpdateFileData["path"]>({ fileId }),
        body: data as unknown as MediaFileUpdate, // 显式断言：Camel -> Unknown -> Snake
        throwOnError: true,
      });
      return result.data;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.detail(v.fileId) });
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      toast.success("信息更新成功");
    },
    onError: (err: Error) => toast.error("更新失败：" + err.message),
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
        path: denormalizeApiRequest<Raw.RegenerateThumbnailsData["path"]>({
          fileId: id,
        }),
        throwOnError: true,
      });
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["media", "blob", id] });
      toast.success("缩略图已重绘");
    },
    onError: (err: Error) => toast.error("重绘失败：" + err.message),
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
        path: denormalizeApiRequest<Raw.DeleteFileData["path"]>({ fileId: id }),
        throwOnError: true,
      });
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mediaKeys.stats() });
    },
    onError: (err: Error) => toast.error("删除失败：" + err.message),
  });
}

/**
 * 批量删除文件 Mutation
 */
export function useBatchDeleteFiles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      // 构造符合前端类型的驼峰对象
      const payload: MediaBatchDelete = { fileIds: ids };
      const res = await batchDeleteFiles({
        // 显式断言：Camel -> Unknown -> Snake
        body: payload as unknown as BatchDeleteRequest,
        throwOnError: true,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mediaKeys.stats() });
    },
    onError: (err: Error) => toast.error("批量操作异常：" + err.message),
  });
}
