"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { logAnalyticsEvent } from "@/shared/api";
import { toSnakeCase } from "@/shared/api/helpers";
import type { LogAnalyticsEventData } from "@/shared/api/types";
import { client } from "@/shared/api";

const generateId = () => {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15);
};

const VISITOR_KEY = "blog_visitor_id";
const SESSION_KEY = "blog_session_id";

/**
 * 流量上报 Hook (增强版)
 *
 * 优化点:
 * 1. 使用 navigator.sendBeacon 确保页面关闭/刷新时数据不丢失
 * 2. 统一的心跳计时逻辑，涵盖: 30s 定时、Tab 切换、页面卸载、路由切换
 * 3. 兼容 pagehide 事件 (比 unload 更可靠)
 */
export function useAnalytics() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  const getVisitorId = useCallback(() => {
    if (typeof window === "undefined") return "";
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  }, []);

  const getSessionId = useCallback(() => {
    if (typeof window === "undefined") return "";
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = generateId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }, []);

  const createEventBody = useCallback(
    (params: {
      eventType: string;
      pagePath?: string;
      postId?: string;
      payload?: Record<string, unknown>;
    }) => {
      return toSnakeCase({
        eventType: params.eventType,
        pagePath: params.pagePath || window.location.pathname,
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        postId: params.postId || undefined,
        payload: params.payload,
        referrer: document.referrer || undefined,
      });
    },
    [getVisitorId, getSessionId],
  );

  /**
   * 普通上报 (使用 fetch)
   */
  const trackEvent = useCallback(
    async (params: {
      eventType: string;
      pagePath?: string;
      postId?: string;
      payload?: Record<string, unknown>;
    }) => {
      try {
        const body = createEventBody(params);
        await logAnalyticsEvent({
          body: body as unknown as LogAnalyticsEventData["body"],
        });
      } catch (error) {
        console.error("Failed to track event:", error);
      }
    },
    [createEventBody],
  );

  /**
   * 信标上报 (使用 sendBeacon，用于页面卸载/隐藏)
   */
  const trackEventBeacon = useCallback(
    (params: { eventType: string; payload?: Record<string, unknown> }) => {
      try {
        if (!navigator.sendBeacon) return; // 降级或忽略
        const body = createEventBody(params);
        const blob = new Blob([JSON.stringify(body)], {
          type: "application/json",
        });
        // 假设 API 路径。如果 client 配置有 baseURL，理想情况是获取它。
        // 这里为了稳健，使用相对路径，通常 Next.js 会代理或同域
        const url = `${client.getConfig().baseUrl || ""}/api/v1/analytics/events`;
        navigator.sendBeacon(url, blob);
      } catch (e) {
        console.error("Beacon failed", e);
      }
    },
    [createEventBody],
  );

  /**
   * 页面浏览追踪 (Page View)
   */
  useEffect(() => {
    if (pathname && lastTrackedPath.current !== pathname) {
      trackEvent({ eventType: "page_view", pagePath: pathname });
      lastTrackedPath.current = pathname;
    }
  }, [pathname, trackEvent]);

  /**
   * 心跳与时长追踪 (Heartbeat)
   */
  const lastTrackedTime = useRef<number>(0);

  useEffect(() => {
    // 初始化计时器
    lastTrackedTime.current = Date.now();

    // 核心上报逻辑
    const reportHeartbeat = (isBeacon = false) => {
      const now = Date.now();
      if (lastTrackedTime.current > 0) {
        const delta = Math.floor((now - lastTrackedTime.current) / 1000);
        // 只有 > 0s 才上报，避免无效请求
        if (delta > 0) {
          const params = {
            eventType: "heartbeat",
            payload: { duration: delta },
          };
          if (isBeacon) {
            trackEventBeacon(params);
          } else {
            trackEvent(params);
          }
        }
      }
      // 重置计时器
      lastTrackedTime.current = now;
    };

    // 1. 定时器 (每 30s)
    const intervalId = setInterval(() => reportHeartbeat(false), 30000);

    // 2. 页面可见性变化 (隐藏/最小化时上报)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        reportHeartbeat(false);
      } else {
        // 重新可见时，重置计时器，不计算后台挂起的时间
        lastTrackedTime.current = Date.now();
      }
    };

    // 3. 页面卸载/关闭 (pagehide) - 必须用 Beacon
    const handlePageHide = () => {
      reportHeartbeat(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      // 组件卸载 (路由切换) 时上报
      reportHeartbeat(false);
    };
  }, [pathname, trackEvent, trackEventBeacon]);

  return { trackEvent };
}
