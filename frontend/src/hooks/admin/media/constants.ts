import { type GetUserFilesData, type GetAllFilesAdminData } from "@/shared/api";

/**
 * Media 相关的查询键常量
 * 用于维护 React Query 缓存的一致性
 */
export const mediaKeys = {
  all: ["media"] as const,
  lists: () => [...mediaKeys.all, "list"] as const,
  userList: (filters?: GetUserFilesData["query"]) =>
    [...mediaKeys.lists(), "user", filters] as const,
  adminList: (filters?: GetAllFilesAdminData["query"]) =>
    [...mediaKeys.lists(), "admin", filters] as const,
  stats: () => [...mediaKeys.all, "stats"] as const,
  details: () => [...mediaKeys.all, "detail"] as const,
  detail: (id: string) => [...mediaKeys.details(), id] as const,
  blob: (id: string, size?: string) =>
    [...mediaKeys.all, "blob", id, size] as const,
};

/**
 * 媒体上传配置 (与后端 validation.py 保持一致)
 */
export const MEDIA_CONFIG = {
  // 单文件大小限制 (Bytes)
  MAX_SIZE: {
    IMAGE: 10 * 1024 * 1024, // 10MB
    VIDEO: 100 * 1024 * 1024, // 100MB
    DOCUMENT: 20 * 1024 * 1024, // 20MB
    OTHER: 5 * 1024 * 1024, // 5MB
  },
  // 全局最大限制 (用于 Dropzone 初筛)
  GLOBAL_MAX_SIZE: 100 * 1024 * 1024, // 100MB

  // 允许的类型
  ACCEPTED_TYPES: {
    IMAGE: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"] },
    VIDEO: { "video/*": [".mp4", ".webm", ".avi", ".mov"] },
    DOCUMENT: { "application/pdf": [".pdf"], "text/plain": [".txt", ".md"] },
  },
};
