"use client";

import { useMemo, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";

import { barY, defineChart } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChartRow {
  stage: string;
  value: number;
}

interface ChartDataset {
  title: string;
  unit: string;
  rows: readonly ChartRow[];
}

const DATASETS = {
  pipeline: {
    title: "渲染链路耗时",
    unit: "ms",
    rows: [
      { stage: "Markdown", value: 32 },
      { stage: "MDX", value: 48 },
      { stage: "Highlight", value: 18 },
      { stage: "TOC", value: 9 },
    ],
  },
  reading: {
    title: "一周阅读分布",
    unit: "篇",
    rows: [
      { stage: "周一", value: 4 },
      { stage: "周二", value: 7 },
      { stage: "周三", value: 5 },
      { stage: "周四", value: 9 },
      { stage: "周五", value: 6 },
    ],
  },
} satisfies Record<string, ChartDataset>;

type DatasetKey = keyof typeof DATASETS;

/**
 * MDX 中的 TanStack Charts 示例。
 *
 * 这个组件同时验证三件事：
 * - MDX 可以注册任意 React 组件
 * - TanStack Charts 可以在 Next.js RSC 页面中 SSR + hydration
 * - 图表可以拥有自己的交互状态（切换数据、点击选中）
 */
export function TanStackChart({
  initialDataset = "pipeline",
  className,
}: {
  initialDataset?: DatasetKey;
  className?: string;
}) {
  const [datasetKey, setDatasetKey] = useState<DatasetKey>(initialDataset);
  const [selected, setSelected] = useState<string | null>(null);
  const dataset = DATASETS[datasetKey];

  const definition = useMemo(() => {
    return defineChart({
      marks: [
        barY(dataset.rows, {
          x: "stage",
          y: "value",
          fill: "#10b981",
        }),
      ],
      scales: {
        x: {
          scale: () => scaleBand().padding(0.24),
        },
        y: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: {
            label: dataset.unit,
          },
        },
      },
      theme: {
        palette: ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0"],
      },
      tooltip,
    });
  }, [dataset]);

  return (
    <div
      className={cn(
        "not-prose my-8 overflow-hidden rounded-xl border border-border/70 bg-card/60",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold text-foreground">
            {dataset.title}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            TanStack Charts
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
          onClick={() =>
            setDatasetKey((current) =>
              current === "pipeline" ? "reading" : "pipeline",
            )
          }
        >
          <RefreshCw className="h-3 w-3" />
          切换数据
        </Button>
      </div>

      <div className="p-4">
        <Chart
          definition={definition}
          height={280}
          initialWidth={720}
          ariaLabel={`${dataset.title}柱状图`}
          onSelect={(point) =>
            setSelected(point ? String(point.datum.stage) : null)
          }
        />
      </div>

      <div className="flex min-h-8 items-center border-t border-border/60 px-4 py-2 font-mono text-[11px] text-muted-foreground">
        {selected
          ? `选中：${selected}`
          : "点击柱体可以触发 MDX 自定义交互，提示文字会显示在这里。"}
      </div>
    </div>
  );
}
