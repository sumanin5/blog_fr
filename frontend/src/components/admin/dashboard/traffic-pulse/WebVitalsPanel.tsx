"use client";

import React from "react";
import { Gauge } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { AdminTable } from "@/components/admin/common/admin-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AnalyticsWebVitals } from "@/shared/api/types";

type Rating = "good" | "needs-improvement" | "poor";

// Google Core Web Vitals 阈值（p75）：[良好上限, 较差下限]
const THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

const LABELS: Record<string, string> = {
  LCP: "最大内容绘制",
  INP: "交互响应",
  CLS: "布局偏移",
  FCP: "首次内容绘制",
  TTFB: "首字节时间",
};

const RATING_STYLE: Record<Rating, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  "needs-improvement": "text-amber-600 dark:text-amber-400",
  poor: "text-rose-600 dark:text-rose-400",
};

const RATING_LABEL: Record<Rating, string> = {
  good: "良好",
  "needs-improvement": "待改进",
  poor: "较差",
};

function rate(name: string, value: number): Rating {
  const [good, poor] = THRESHOLDS[name] ?? [Infinity, Infinity];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

function format(name: string, value: number | null | undefined) {
  if (value == null) return "—";
  if (name === "CLS") return value.toFixed(3);
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}

function Value({ name, value }: { name: string; value: number | null | undefined }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return <span className={RATING_STYLE[rate(name, value)]}>{format(name, value)}</span>;
}

type PageRow = AnalyticsWebVitals["slowestPages"][number];

const columns: ColumnDef<PageRow>[] = [
  {
    accessorKey: "pagePath",
    header: "页面",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.pagePath}</span>,
  },
  {
    accessorKey: "lcp",
    header: () => <div className="text-right">LCP p75</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        <Value name="LCP" value={row.original.lcp} />
      </div>
    ),
  },
  {
    accessorKey: "inp",
    header: () => <div className="text-right">INP p75</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        <Value name="INP" value={row.original.inp} />
      </div>
    ),
  },
  {
    accessorKey: "cls",
    header: () => <div className="text-right">CLS p75</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        <Value name="CLS" value={row.original.cls} />
      </div>
    ),
  },
  {
    accessorKey: "samples",
    header: () => <div className="text-right">样本</div>,
    cell: ({ row }) => <div className="text-right">{row.original.samples}</div>,
  },
];

interface WebVitalsPanelProps {
  data?: AnalyticsWebVitals;
}

export const WebVitalsPanel: React.FC<WebVitalsPanelProps> = ({ data }) => {
  const metrics = data?.metrics ?? [];
  const pages = data?.slowestPages ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((metric) => {
          const rating = metric.p75 != null ? rate(metric.name, metric.p75) : null;
          return (
            <Card key={metric.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.name}
                  <span className="ml-1 font-normal text-muted-foreground">
                    {LABELS[metric.name]}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Value name={metric.name} value={metric.p75} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {rating ? `${RATING_LABEL[rating]} · ` : ""}p75 · {metric.samples} 样本
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gauge className="size-5 text-slate-400" />
            <div>
              <CardTitle>最慢页面</CardTitle>
              <CardDescription>
                过去 {data?.days ?? 7} 天真实用户数据，按 LCP p75 降序（阈值参照 Google Core Web Vitals）
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AdminTable data={pages} columns={columns} getRowId={(row) => row.pagePath} />
        </CardContent>
      </Card>
    </div>
  );
};
