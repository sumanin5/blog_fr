"use client";

import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";
import { sendAnalyticsBeacon } from "@/hooks/use-analytics";

type ReportedMetric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];

const CORE_METRICS = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);

// 按“硬加载”收集：web-vitals 只对整页加载产出 LCP/FCP/TTFB，
// 客户端路由切换期间的 CLS/INP 也归属到落地页（与 CrUX 口径一致）
const collected: Record<string, number> = {};
let landingPath: string | null = null;
let navigationType: string | undefined;
let flushed = false;

function handleMetric(metric: ReportedMetric) {
  if (!CORE_METRICS.has(metric.name)) return;
  // payload 键必须小写：请求体会被 decamelize（"LCP" -> "l_c_p"）
  collected[metric.name.toLowerCase()] =
    metric.name === "CLS" ? Number(metric.value.toFixed(4)) : Math.round(metric.value);
  navigationType ??= metric.navigationType;
}

function flush() {
  if (flushed || Object.keys(collected).length === 0) return;
  flushed = true;
  sendAnalyticsBeacon({
    eventType: "web_vitals",
    pagePath: landingPath ?? window.location.pathname,
    payload: { metrics: { ...collected }, navigation_type: navigationType },
  });
}

/**
 * Core Web Vitals 真实用户上报 (RUM)
 *
 * 每次页面加载最多一条 web_vitals 事件，在页面首次隐藏时用 sendBeacon 发出，
 * 避免逐指标上报放大埋点接口的请求量。后端不将其计入 PV/UV 等流量统计。
 */
export function WebVitalsReporter() {
  useReportWebVitals(handleMetric);

  useEffect(() => {
    landingPath ??= window.location.pathname;
    const onVisibilityChange = () => {
      // web-vitals 在同一个 visibilitychange 事件中才交出 CLS/INP 的最终值，
      // 推迟到下一个任务再发，确保它们已写入 collected
      if (document.visibilityState === "hidden") setTimeout(flush, 0);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  return null;
}
