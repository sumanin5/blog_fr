"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { logAnalyticsEvent } from "@/shared/api";
import { toSnakeCase } from "@/shared/api/helpers";
import type { LogAnalyticsEventData } from "@/shared/api/types";

// 简单的 ID 生成器
const generateId = () => {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15);
};

const VISITOR_KEY = "blog_visitor_id";
const SESSION_KEY = "blog_session_id";

/**
 * 流量上报 Hook
 */
export function useAnalytics() {
  const pathname = usePathname();
  // 使用 ref 避免在渲染期间重复发送页面浏览
  const lastTrackedPath = useRef<string | null>(null);

  /**
   * 获取或创建访客 ID
   */
  const getVisitorId = () => {
    if (typeof window === "undefined") return "";
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  };

  /**
   * 获取或创建会话 ID
   */
  const getSessionId = () => {
    if (typeof window === "undefined") return "";
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = generateId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  };

  /**
   * 核心上报函数
   */
  const trackEvent = useCallback(
    async (params: {
      eventType: string;
      pagePath?: string;
      postId?: string;
      payload?: Record<string, unknown>;
    }) => {
      try {
        // 关键修复：手动进行驼峰转蛇形映射，并确保 postId 符合 UUID 格式（或为 undefined）
        const body = toSnakeCase({
          eventType: params.eventType,
          pagePath: params.pagePath || pathname,
          visitorId: getVisitorId(),
          sessionId: getSessionId(),
          postId: params.postId || undefined,
          payload: params.payload,
          referrer:
            typeof document !== "undefined" ? document.referrer : undefined,
        });

        await logAnalyticsEvent({
          body: body as unknown as LogAnalyticsEventData["body"],
        });
      } catch (error) {
        console.error("Failed to track event:", error);
      }
    },
    [pathname],
  );

  /**
   * 自动追踪页面浏览
   */
  useEffect(() => {
    if (pathname && lastTrackedPath.current !== pathname) {
      trackEvent({ eventType: "page_view", pagePath: pathname });
      lastTrackedPath.current = pathname;
    }
  }, [pathname, trackEvent]);

  return { trackEvent };
}
