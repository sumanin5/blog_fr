"use client";

import { useAnalytics } from "@/hooks/use-analytics";
import { useEffect, useRef } from "react";

/**
 * 文章阅读追踪组件
 * 自动触发 article_view 事件，携带 postId
 */
export function ArticleTracker({ postId }: { postId: string }) {
  const { trackEvent } = useAnalytics();
  const trackedRef = useRef(false);

  useEffect(() => {
    // 避免 React Strict Mode 下重复触发
    if (trackedRef.current) return;

    if (postId) {
      trackEvent({
        eventType: "article_view",
        postId: postId,
      });
      trackedRef.current = true;
    }
  }, [postId, trackEvent]);

  return null;
}
