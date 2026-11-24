"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Code2, Cpu, Eye, Layers } from "lucide-react";

import { RangeSlider } from "@/components/motion/range-slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  highlightMarkdownCode,
  normalizeCodeLanguage,
} from "@/lib/markdown/highlight";
import { cn } from "@/lib/utils";
import { CopyButton } from "../utils/copy-button";

export interface LayerStep {
  /** 层级唯一 ID */
  id: string;
  /** 层级名称（如：应用代码 / 虚拟内存 / 页表映射 / 物理页框） */
  name: string;
  /** 可选徽章（如：Ring 3 / L1 / 用户态） */
  badge?: string;
  /** 表象栏标题，默认 "对外承诺 / 表象" */
  surfaceLabel?: string;
  /** 对外给出的承诺或表象描述 */
  surface: string;
  /** 底层栏标题，默认 "底层真实运转" */
  beneathLabel?: string;
  /** 底层真实机制描述 */
  beneath: string;
  /** 可选：同一份数据在这一层的呈现形态 */
  sample?: string;
  /** 可选：sample 的代码高亮语言（如 ts, python, json, sql, plaintext） */
  codeLang?: string;
}

export interface LayerStepperProps {
  /** 组件主标题 */
  title?: string;
  /** 可选副标题 */
  subtitle?: string;
  /** 默认选中的层级索引（0-based） */
  defaultIndex?: number;
  /** 自顶向下排列的层级列表 */
  layers: LayerStep[];
}

/**
 * 多层级抽象步进器：点击层级阶梯或拖动深度滑块，逐层剥离“表层承诺 vs 底层真相”。
 */
export function LayerStepper({
  title = "多层级抽象步进器",
  subtitle = "沿着抽象阶梯逐层下潜，观察同一份数据与接口在不同层次上的承诺与真实代价。",
  defaultIndex = 0,
  layers,
}: LayerStepperProps) {
  const safeLayers = Array.isArray(layers) ? layers : [];
  const clampIndex = React.useCallback(
    (idx: number) => {
      if (safeLayers.length === 0) return 0;
      const rounded = Math.round(idx);
      return Math.min(safeLayers.length - 1, Math.max(0, rounded));
    },
    [safeLayers.length],
  );

  const [activeIndex, setActiveIndex] = React.useState<number>(() =>
    clampIndex(defaultIndex),
  );

  React.useEffect(() => {
    setActiveIndex((prev) => clampIndex(prev));
  }, [clampIndex]);

  const activeLayer = safeLayers[activeIndex];
  const sampleInfo = React.useMemo(() => {
    if (!activeLayer?.sample) return null;
    const normalizedLang = normalizeCodeLanguage(activeLayer.codeLang);
    let highlighted = activeLayer.sample;
    try {
      highlighted = highlightMarkdownCode(activeLayer.sample, normalizedLang);
    } catch {
      highlighted = activeLayer.sample;
    }
    return {
      raw: activeLayer.sample,
      normalizedLang,
      label: normalizedLang === "plaintext" ? "text" : normalizedLang,
      highlighted,
    };
  }, [activeLayer]);

  if (safeLayers.length === 0 || !activeLayer) {
    return (
      <Alert className="not-prose my-6">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>暂未配置抽象层级列表（layers）。</AlertDescription>
      </Alert>
    );
  }

  const depthPercent =
    safeLayers.length <= 1
      ? 100
      : Math.round(((activeIndex + 1) / safeLayers.length) * 100);

  return (
    <Card className="not-prose my-8 gap-0 overflow-hidden border-border/70 bg-card/70 py-0 shadow-sm">
      <CardHeader className="gap-4 border-b border-border/60 bg-muted/30 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Layers aria-hidden="true" className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold text-foreground sm:text-lg">
                {title}
              </CardTitle>
              <Badge variant="secondary" className="font-mono text-xs">
                L{activeIndex + 1} / L{safeLayers.length}
              </Badge>
            </div>
            {subtitle ? (
              <CardDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {subtitle}
              </CardDescription>
            ) : null}
          </div>
        </div>

        <div
          role="tablist"
          aria-label="选择抽象层级"
          className="flex flex-wrap gap-2"
        >
          {safeLayers.map((layer, index) => {
            const isSelected = index === activeIndex;
            return (
              <Button
                key={layer.id || `${layer.name}-${index}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                size="sm"
                variant={isSelected ? "default" : "outline"}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "h-auto gap-1.5 px-3 py-1.5 text-xs sm:text-sm",
                  !isSelected && "bg-background/80 text-foreground hover:bg-muted",
                )}
              >
                <span className="font-mono opacity-75">L{index + 1}</span>
                <span className="font-medium">{layer.name}</span>
              </Button>
            );
          })}
        </div>

        {safeLayers.length > 1 ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>表层抽象（L1）</span>
              <span className="font-mono text-foreground">
                当前：L{activeIndex + 1} · {activeLayer.name}
              </span>
              <span>底层实现（L{safeLayers.length}）</span>
            </div>
            <RangeSlider
              min={0}
              max={safeLayers.length - 1}
              step={1}
              value={activeIndex}
              onValueChange={(next) => setActiveIndex(clampIndex(next))}
              showTicks
              aria-label="拖动切换抽象深度层级"
              formatValueText={(idx) => {
                const target = safeLayers[clampIndex(idx)];
                return target ? `L${idx + 1}: ${target.name}` : `L${idx + 1}`;
              }}
            />
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              第 {activeIndex + 1} 层
            </Badge>
            <h4 className="text-base font-semibold text-foreground sm:text-lg">
              {activeLayer.name}
            </h4>
            {activeLayer.badge ? (
              <Badge variant="secondary" className="text-xs">
                {activeLayer.badge}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-info/35 bg-info/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-foreground">
              <Eye aria-hidden="true" className="size-4 text-info" />
              <span>{activeLayer.surfaceLabel ?? "对外承诺 / 表象"}</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              {activeLayer.surface}
            </p>
          </div>

          <div className="rounded-lg border border-border/80 bg-muted/45 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-foreground">
              <Cpu aria-hidden="true" className="size-4 text-primary" />
              <span>{activeLayer.beneathLabel ?? "底层真实运转"}</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              {activeLayer.beneath}
            </p>
          </div>
        </div>

        {sampleInfo ? (
          <div className="overflow-hidden rounded-lg border border-border/70 bg-muted/25">
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3.5 py-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Code2 aria-hidden="true" className="size-3.5 text-primary" />
                <span>同一份数据在本层的呈现形态</span>
                <Badge variant="outline" className="font-mono text-[11px] uppercase">
                  {sampleInfo.label}
                </Badge>
              </div>
              <CopyButton code={sampleInfo.raw} />
            </div>
            <div className="markdown-body">
              <pre
                className="tm-code m-0 overflow-x-auto p-3.5 text-xs leading-6 sm:text-[13px]"
                data-lang={sampleInfo.normalizedLang}
              >
                <code
                  className={`language-${sampleInfo.normalizedLang} border-0 bg-transparent p-0!`}
                  dangerouslySetInnerHTML={{ __html: sampleInfo.highlighted }}
                />
              </pre>
            </div>
          </div>
        ) : null}
      </CardContent>

      {safeLayers.length > 1 ? (
        <CardFooter className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex w-full items-center gap-3 sm:max-w-xs">
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              下潜进度
            </span>
            <Progress value={depthPercent} className="h-2 flex-1" />
            <span className="shrink-0 font-mono text-xs text-foreground">
              {depthPercent}%
            </span>
          </div>

          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={activeIndex <= 0}
              onClick={() => setActiveIndex((prev) => clampIndex(prev - 1))}
              className="gap-1 text-xs"
            >
              <ChevronLeft aria-hidden="true" className="size-3.5" />
              上浮一层
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={activeIndex >= safeLayers.length - 1}
              onClick={() => setActiveIndex((prev) => clampIndex(prev + 1))}
              className="gap-1 text-xs"
            >
              下潜一层
              <ChevronRight aria-hidden="true" className="size-3.5" />
            </Button>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}
