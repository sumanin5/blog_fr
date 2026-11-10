"use client";

import { trackAnalyticsEvent } from "@/hooks/use-analytics";
import { useEffect, useRef } from "react";

/**
 * 文章阅读追踪组件
 * 自动触发 article_view 事件，携带 postId
 * 不要在这里调用 useAnalytics()：全局 AnalyticsTracker 已负责 page_view 与心跳，
 * 重复挂载会让文章页的 PV 与停留时长翻倍
 */
export function ArticleTracker({ postId }: { postId: string }) {
  const trackedRef = useRef(false);

  useEffect(() => {
    // 避免 React Strict Mode 下重复触发
    if (trackedRef.current) return;

    if (postId) {
      trackAnalyticsEvent({
        eventType: "article_view",
        postId: postId,
      });
      trackedRef.current = true;
    }
  }, [postId]);

  return null;
}
