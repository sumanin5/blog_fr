"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserFiles,
  uploadFile,
  deleteFile,
  getFileDetail,
  updateFile,
  viewFile,
  viewThumbnail,
  batchDeleteFiles,
  type MediaFileResponse,
  type MediaFileUpdate,
  type GetUserFilesData,
} from "@/shared/api";

export type { MediaFileResponse, MediaFileUpdate, GetUserFilesData };

/**
 * Media 相关的查询键
 */
export const mediaKeys = {
  all: ["media"] as const,
  lists: () => [...mediaKeys.all, "list"] as const,
  list: (filters?: GetUserFilesData["query"]) =>
    [...mediaKeys.lists(), filters] as const,
  details: () => [...mediaKeys.all, "detail"] as const,
  detail: (id: string) => [...mediaKeys.details(), id] as const,
  blob: (id: string, size?: string) =>
    [...mediaKeys.all, "blob", id, size] as const,
};

/**
 * 获取媒体文件 Blob (用于受保护的图片显示)
 */
export function useMediaBlob(
  file: MediaFileResponse | null,
  size?: "small" | "medium" | "large"
) {
  return useQuery({
    queryKey: mediaKeys.blob(file?.id ?? "", size),
    queryFn: async () => {
      if (!file) return null;

      // 如果是公开文件或完整 URL
      if (file.file_path.startsWith("http") && !file.is_public) {
        // External link logic if needed
      }

      let response;

      // 总是优先尝试获取缩略图，只要指定了 size 且是图片
      if (size && file.media_type === "image") {
        try {
          response = await viewThumbnail({
            path: { file_id: file.id, size },
            parseAs: "blob",
            throwOnError: true,
          });
          return response.data as unknown as Blob;
        } catch {
          // 获取缩略图失败(404等)，继续后续降级逻辑
        }
      }

      // 如果没有请求缩略图，或者获取缩略图失败，则尝试获取原图
      if (file.media_type === "image") {
        response = await viewFile({
          path: { file_id: file.id },
          parseAs: "blob",
          throwOnError: true,
        });
        return response.data as unknown as Blob;
      }

      return null;
    },
    // 只要是图片就启用查询，不依赖 file.thumbnails 字段(因为后端该字段可能不准确或缺失)
    enabled: !!file && file.media_type === "image",
    staleTime: 1000 * 60 * 60, // 1小时缓存
    gcTime: 1000 * 60 * 60, // 1小时保留
  });
}

/**
 * 获取用户媒体文件列表
 */
export function useMediaFiles(filters?: GetUserFilesData["query"]) {
  return useQuery({
    queryKey: mediaKeys.list(filters),
    queryFn: async () => {
      const response = await getUserFiles({
        query: filters,
        throwOnError: true,
      });
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 分钟缓存
  });
}

/**
 * 获取单个媒体文件详情
 */
export function useMediaFile(fileId: string | null) {
  return useQuery({
    queryKey: mediaKeys.detail(fileId ?? ""),
    queryFn: async () => {
      if (!fileId) return null;
      const response = await getFileDetail({
        path: { file_id: fileId },
        throwOnError: true,
      });
      return response.data;
    },
    enabled: !!fileId,
  });
}

/**
 * 上传文件 Mutation
 */
export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      usage = "general",
      isPublic = false,
      description = "",
      altText = "",
    }: {
      file: File;
      usage?: "cover" | "avatar" | "general";
      isPublic?: boolean;
      description?: string;
      altText?: string;
    }) => {
      const response = await uploadFile({
        body: {
          file,
          usage,
          is_public: isPublic,
          description,
          alt_text: altText,
        },
        throwOnError: true,
      });
      return response.data;
    },
    onSuccess: () => {
      // 上传成功后，使所有列表查询失效
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
    },
  });
}

/**
 * 更新文件信息 Mutation
 */
export function useUpdateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      data,
    }: {
      fileId: string;
      data: MediaFileUpdate;
    }) => {
      const response = await updateFile({
        path: { file_id: fileId },
        body: data,
        throwOnError: true,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      // 更新成功后，使相关查询失效
      queryClient.invalidateQueries({
        queryKey: mediaKeys.detail(variables.fileId),
      });
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
    },
  });
}

/**
 * 删除文件 Mutation
 */
export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      await deleteFile({
        path: { file_id: fileId },
        throwOnError: true,
      });
      return fileId;
    },
    onSuccess: (fileId) => {
      // 删除成功后，使相关查询失效
      queryClient.invalidateQueries({
        queryKey: mediaKeys.detail(fileId),
      });
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
    },
  });
}

/**
 * 批量删除文件 Mutation
 */
export function useBatchDeleteFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileIds: string[]) => {
      const response = await batchDeleteFiles({
        body: { file_ids: fileIds },
        throwOnError: true,
      });
      return response.data;
    },
    onSuccess: () => {
      // 删除成功后，使列表查询失效
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
    },
  });
}

/**
 * 获取媒体文件的完整 URL
 */
export function getMediaUrl(file: MediaFileResponse | null): string | null {
  if (!file) return null;

  // 如果是完整 URL，直接返回
  if (file.file_path.startsWith("http")) {
    return file.file_path;
  }

  // 返回相对路径，由 Next.js 代理转发到后端
  // 这样可以自动携带 Cookie 等认证信息
  return `/api/v1/media/${file.id}/view`;
}

/**
 * 获取缩略图 URL
 */
export function getThumbnailUrl(
  file: MediaFileResponse | null,
  size: "small" | "medium" | "large" | "xlarge" = "medium"
): string | null {
  if (!file) return null;

  // 如果有缩略图路径，返回缩略图 URL
  if (file.thumbnails && file.thumbnails[size]) {
    // 返回相对路径
    return `/api/v1/media/${file.id}/thumbnail/${size}`;
  }

  // 如果是图片但没有缩略图，返回原图
  if (file.media_type === "image") {
    return getMediaUrl(file);
  }

  return null;
}
