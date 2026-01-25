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
import { denormalizeApiRequest } from "@/shared/api/transformers";
import { mediaKeys } from "./constants";
import type * as Raw from "@/shared/api/generated/types.gen";
import type {
  MediaFile,
  MediaStats,
  UserMediaList,
  AdminMediaList,
  MediaFilters,
  AdminMediaFilters,
} from "@/shared/api/types";

// 关于类型断言的说明，请参阅：./TYPE_CONVERSION_NOTES.md

/**
 * 🔒 鉴权级资源获取
 */
export function useMediaBlob(
  file: MediaFile | null,
  size?: "small" | "medium" | "large"
) {
  return useQuery({
    queryKey: mediaKeys.blob(file?.id ?? "", size),
    queryFn: async () => {
      if (!file) return null;

      if (size && file.mediaType === "image") {
        try {
          const response = await viewThumbnail({
            path: denormalizeApiRequest<Raw.ViewThumbnailData["path"]>({
              fileId: file.id,
              size,
            }),
            parseAs: "blob",
            throwOnError: true,
          });
          return response.data as Blob;
        } catch {
          /* 自动降级 */
        }
      }

      const response = await viewFile({
        path: denormalizeApiRequest<Raw.ViewFileData["path"]>({
          fileId: file.id,
        }),
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
        // 手动转换 query 参数，因为 SDK 的拦截器在 URL 构建后才执行
        query: denormalizeApiRequest(filters),
        throwOnError: true,
      });
      return response.data as unknown as UserMediaList;
    },
  });
}

export function useAllMediaAdmin(filters?: AdminMediaFilters) {
  return useQuery({
    queryKey: mediaKeys.adminList(filters),
    queryFn: async () => {
      const response = await getAllFilesAdmin({
        // 手动转换 query 参数，因为 SDK 的拦截器在 URL 构建后才执行
        query: denormalizeApiRequest(filters),
        throwOnError: true,
      });
      return response.data as unknown as AdminMediaList;
    },
  });
}

export function useMediaStats() {
  return useQuery({
    queryKey: mediaKeys.stats(),
    queryFn: async () => {
      const response = await getStatsOverview({ throwOnError: true });
      return response.data as unknown as MediaStats;
    },
  });
}

export function useMediaFile(fileId: string | null) {
  return useQuery({
    queryKey: mediaKeys.detail(fileId ?? ""),
    queryFn: async () => {
      if (!fileId) return null;
      const response = await getFileDetail({
        path: denormalizeApiRequest<Raw.GetFileDetailData["path"]>({ fileId }),
        throwOnError: true,
      });
      return response.data as unknown as MediaFile;
    },
    enabled: !!fileId,
  });
}
