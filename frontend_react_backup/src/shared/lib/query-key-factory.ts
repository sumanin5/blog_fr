/**
 * 🏭 Query Key 工厂
 *
 * 提供创建查询键的通用工具函数，各个 feature 使用这些工具创建自己的查询键
 * 这样既保持了通用性，又避免了中心化的业务逻辑
 */

/**
 * 创建基础查询键工厂
 */
export function createQueryKeyFactory<T extends string>(namespace: T) {
  return {
    // 所有该命名空间的查询
    all: [namespace] as const,

    // 列表查询
    lists: () => [namespace, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [namespace, "list", filters] as const,

    // 详情查询
    details: () => [namespace, "detail"] as const,
    detail: (id: string | number) => [namespace, "detail", id] as const,

    // 自定义查询
    custom: (...keys: readonly unknown[]) => [namespace, ...keys] as const,
  };
}

/**
 * 创建无限查询键工厂
 */
export function createInfiniteQueryKeyFactory<T extends string>(namespace: T) {
  const base = createQueryKeyFactory(namespace);

  return {
    ...base,
    // 无限列表查询
    infiniteList: (filters?: Record<string, unknown>) =>
      [namespace, "infinite", filters] as const,
  };
}
