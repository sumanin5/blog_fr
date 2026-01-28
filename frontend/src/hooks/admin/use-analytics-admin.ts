import { useQuery } from "@tanstack/react-query";
import {
  getAnalyticsOverview,
  getAnalyticsTrend,
  getAnalyticsTopPosts,
} from "@/shared/api";
import type {
  AnalyticsOverview,
  AnalyticsDailyTrend,
  AnalyticsTopPost,
  GetAnalyticsTrendData,
  GetAnalyticsTopPostsData,
} from "@/shared/api/types";

export const analyticsKeys = {
  all: ["analytics"] as const,
  overview: () => [...analyticsKeys.all, "overview"] as const,
  trend: (days: number) => [...analyticsKeys.all, "trend", days] as const,
  topPosts: (limit: number) =>
    [...analyticsKeys.all, "top-posts", limit] as const,
};

/**
 * 获取全站流量概览
 */
export function useAnalyticsOverview() {
  return useQuery({
    queryKey: analyticsKeys.overview(),
    queryFn: async () => {
      const response = await getAnalyticsOverview({ throwOnError: true });
      return response.data as unknown as AnalyticsOverview;
    },
  });
}

/**
 * 获取流量趋势
 * @param days 统计天数
 */
export function useAnalyticsTrend(days: number = 7) {
  return useQuery({
    queryKey: analyticsKeys.trend(days),
    queryFn: async () => {
      const response = await getAnalyticsTrend({
        query: { days } as unknown as GetAnalyticsTrendData["query"],
        throwOnError: true,
      });
      return response.data as unknown as AnalyticsDailyTrend[];
    },
  });
}

/**
 * 获取热门文章排行
 * @param limit 数量限制
 */
export function useAnalyticsTopPosts(limit: number = 10) {
  return useQuery({
    queryKey: analyticsKeys.topPosts(limit),
    queryFn: async () => {
      const response = await getAnalyticsTopPosts({
        query: { limit } as unknown as GetAnalyticsTopPostsData["query"],
        throwOnError: true,
      });
      return response.data as unknown as AnalyticsTopPost[];
    },
  });
}
