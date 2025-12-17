import { createQueryKeyFactory } from "@/shared/lib/query-key-factory";

/**
 * 认证相关的查询键
 */
const factory = createQueryKeyFactory("auth");

export const authQueryKeys = {
  ...factory,
  // 认证状态
  status: () => factory.custom("status"),
  // 当前用户信息
  currentUser: () => factory.custom("currentUser"),
} as const;
