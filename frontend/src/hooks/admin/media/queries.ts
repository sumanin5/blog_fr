"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getUserFiles,
  getAllFilesAdmin,
  getFileDetail,
  viewFile,
  viewThumbnail,
  getStatsOverview,
} from "@/shared/api";
import { normalizeApiResponse } from "@/shared/api/transformers";
import { mediaKeys } from "./constants";
import type {
  GetUserFilesData,
  GetAllFilesAdminData,
} from "@/shared/api/generated/types.gen";
import type {
  MediaFile,
  MediaFilters,
  AdminMediaFilters,
} from "@/shared/api/types";

/**
 * 🔒 鉴权级资源获取
 */
export function useMediaBlob(
  file: MediaFile | null,
  size?: "small" | "medium" | "large",
) {
  return useQuery({
    queryKey: mediaKeys.blob(file?.id ?? "", size),
    queryFn: async () => {
      if (!file) return null;

      if (size && file.mediaType === "image") {
        try {
          const response = await viewThumbnail({
            path: {
              file_id: file.id,
              size,
            },
            parseAs: "blob",
            throwOnError: true,
          });
          return response.data as Blob;
        } catch {
          /* 自动降级 */
        }
      }

      const response = await viewFile({
        path: { file_id: file.id },
        parseAs: "blob",
        throwOnError: true,
      });

      return response.data as Blob;
    },
    enabled: !!file,
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * 获取媒体列表
 */
export function useMediaFiles(filters?: MediaFilters) {
  return useQuery({
    queryKey: mediaKeys.userList(filters),
    queryFn: async () => {
      // 强制手动映射，防止类型定义滞后导致参数被丢弃
      // 尤其是当拦截器可能不处理未定义在 schema 中的字段时
      const queryParams = {
        ...filters,
        mime_type: filters?.mimeType,
      };

      const response = await getUserFiles({
        query: queryParams as unknown as GetUserFilesData["query"],
        throwOnError: true,
      });
      return normalizeApiResponse(response.data);
    },
  });
}

/**
 * 管理员获取所有媒体
 */
export function useAllMediaAdmin(filters?: AdminMediaFilters) {
  return useQuery({
    queryKey: mediaKeys.adminList(filters),
    queryFn: async () => {
      const response = await getAllFilesAdmin({
        // ✅ 逻辑同上，不再手动调用 denormalizeApiRequest
        query: filters as unknown as GetAllFilesAdminData["query"],
        throwOnError: true,
      });
      return normalizeApiResponse(response.data);
    },
  });
}

/**
 * 媒体统计概览
 */
export function useMediaStats() {
  return useQuery({
    queryKey: mediaKeys.stats(),
    queryFn: async () => {
      const response = await getStatsOverview({ throwOnError: true });
      // 注意：stats 由于其结构的特殊性，仍需 normalize 处理，或者确保拦截器已转换全量响应
      return normalizeApiResponse(response.data);
    },
  });
}

/**
 * 媒体详情获取
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
      return normalizeApiResponse(response.data);
    },
    enabled: !!fileId,
  });
}
