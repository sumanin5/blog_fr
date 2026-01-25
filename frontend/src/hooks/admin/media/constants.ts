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
