import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  getAnalyticsDashboard,
  getAnalyticsSessions,
  getAnalyticsOverview,
  getAnalyticsTrend,
  getAnalyticsTopPosts,
  getAnalyticsSessionDetail,
} from "@/shared/api";
import type {
  AnalyticsDashboard,
  AnalyticsSessionList,
  AnalyticsOverview,
  AnalyticsDailyTrend,
  AnalyticsTopPost,
  GetAnalyticsDashboardData,
  GetAnalyticsSessionsData,
  GetAnalyticsTrendData,
  GetAnalyticsTopPostsData,
  AnalyticsSessionDetail,
  GetAnalyticsSessionDetailData,
} from "@/shared/api/types";

// ==========================================
// Query Keys
// ==========================================
export const analyticsKeys = {
  all: ["analytics"] as const,
  dashboard: (days: number) =>
    [...analyticsKeys.all, "dashboard", days] as const,
  sessions: (page: number, size: number) =>
    [...analyticsKeys.all, "sessions", page, size] as const,
  sessionDetail: (sessionId: string) =>
    [...analyticsKeys.all, "session", sessionId] as const,
  overview: () => [...analyticsKeys.all, "overview"] as const,
  trend: (days: number) => [...analyticsKeys.all, "trend", days] as const,
  topPosts: (limit: number) =>
    [...analyticsKeys.all, "topPosts", limit] as const,
};

// ==========================================
// Hooks
// ==========================================

/**
 * 获取仪表盘聚合数据 (KPI + 设备 + 流量趋势)
 */
export function useAnalyticsDashboard(days: number = 30) {
  return useQuery({
    queryKey: analyticsKeys.dashboard(days),
    queryFn: async () => {
      const response = await getAnalyticsDashboard({
        query: { days } as unknown as GetAnalyticsDashboardData["query"],
        throwOnError: true,
      });
      return response.data as unknown as AnalyticsDashboard;
    },
  });
}

/**
 * 获取会话列表 (分页)
 */
export function useAnalyticsSessions(page: number = 1, size: number = 20) {
  return useQuery({
    queryKey: analyticsKeys.sessions(page, size),
    queryFn: async () => {
      const response = await getAnalyticsSessions({
        query: { page, size } as unknown as GetAnalyticsSessionsData["query"],
        throwOnError: true,
      });
      return response.data as unknown as AnalyticsSessionList;
    },
    placeholderData: keepPreviousData, // 分页平滑切换
  });
}

/**
 * 获取单个会话详情 (包含事件流)
 */
export function useAnalyticsSessionDetail(sessionId: string | null) {
  return useQuery({
    queryKey: analyticsKeys.sessionDetail(sessionId || ""),
    queryFn: async () => {
      if (!sessionId) return null;
      const response = await getAnalyticsSessionDetail({
        path: {
          session_id: sessionId,
        } as unknown as GetAnalyticsSessionDetailData["path"],
        throwOnError: true,
      });
      return response.data as unknown as AnalyticsSessionDetail;
    },
    enabled: !!sessionId,
  });
}

/**
 * 获取全站概览 (Overview Tab 专用)
 */
export function useAnalyticsOverview() {
  return useQuery({
    queryKey: analyticsKeys.overview(),
    queryFn: async () => {
      const response = await getAnalyticsOverview({
        throwOnError: true,
      });
      return response.data as unknown as AnalyticsOverview;
    },
  });
}

/**
 * 获取流量趋势 (独立)
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
 * 获取热门文章 (独立)
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
