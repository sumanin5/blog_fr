"use client";

import { useAnalytics } from "@/hooks/use-analytics";

/**
 * 全局分析追踪器组件
 * 仅用于挂载 useAnalytics Hook 以实现自动页面浏览追踪
 */
export function AnalyticsTracker() {
  useAnalytics();
  return null;
}
