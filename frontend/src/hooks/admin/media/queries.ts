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
  GetFileDetailData,
  ViewFileData,
  ViewThumbnailData,
} from "@/shared/api/generated/types.gen";
import type {
  MediaFile,
  MediaStats,
  UserMediaList,
  AdminMediaList,
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
            } as unknown as ViewThumbnailData["path"],
            parseAs: "blob",
            throwOnError: true,
          });
          return response.data as Blob;
        } catch {
          /* 自动降级 */
        }
      }

      const response = await viewFile({
        path: { file_id: file.id } as unknown as ViewFileData["path"],
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
      const response = await getUserFiles({
        // ✅ 业务层直接传驼峰 filters，拦截器会自动进行 snake_case 转换
        query: filters as unknown as GetUserFilesData["query"],
        throwOnError: true,
      });
      return response.data as unknown as UserMediaList;
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
      return response.data as unknown as AdminMediaList;
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
      return normalizeApiResponse(response.data) as MediaStats;
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
        path: { file_id: fileId } as unknown as GetFileDetailData["path"],
        throwOnError: true,
      });
      return response.data as unknown as MediaFile;
    },
    enabled: !!fileId,
  });
}
