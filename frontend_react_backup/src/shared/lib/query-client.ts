import { QueryClient } from "@tanstack/react-query";

/**
 * TanStack Query 客户端配置
 *
 * 主要配置说明：
 * - staleTime: 数据被认为是"新鲜"的时间，在此期间不会重新获取
 * - gcTime: 数据在缓存中保留的时间（原 cacheTime）
 * - retry: 失败时的重试次数
 * - refetchOnWindowFocus: 窗口聚焦时是否重新获取数据
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 用户信息 5 分钟内认为是新鲜的
      staleTime: 5 * 60 * 1000, // 5 minutes
      // 缓存 10 分钟
      gcTime: 10 * 60 * 1000, // 10 minutes
      // 网络错误时重试 3 次
      retry: 3,
      // 窗口聚焦时重新获取（对用户状态很有用）
      refetchOnWindowFocus: true,
      // 网络重连时重新获取
      refetchOnReconnect: true,
    },
    mutations: {
      // 变更操作失败时重试 1 次
      retry: 1,
    },
  },
});
