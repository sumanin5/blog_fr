"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Code2, Layers, Scale } from "lucide-react";

import { RangeSlider } from "@/components/motion/range-slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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

export interface ComplexityStage {
  /** 阶段唯一标识 */
  id: string;
  /** 时代/阶段标签（如 1960s / 2020s） */
  era: string;
  /** 阶段名称（如 汇编手写 / 高级语言 / 云原生 ORM） */
  label: string;
  /** 使用者眼前只需要写的指令 */
  userCode: string;
  /** 可选：userCode 的高亮语言（如 ts, python, sql, shell, plaintext） */
  codeLang?: string;
  /** 使用者直接认知负担 0–100 */
  userBurden: number;
  /** 底层与生态隐藏承载的复杂度 0–100 */
  hiddenComplexity: number;
  /** 可选：单人可透视系统全貌比例 0–100（不传时按 hiddenComplexity 自动推算） */
  comprehensionRatio?: number;
  /** 底下默默扛活的组件/层级徽章列表 */
  hiddenLayers: string[];
  /** 当前时代的得与失结语 */
  takeaway: string;
}

export interface ComplexityShiftProps {
  /** 标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 默认选中的阶段索引（0-based） */
  defaultIndex?: number;
  /** 按时代或抽象演进排列的阶段列表 */
  stages: ComplexityStage[];
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * 复杂性转移天平：展示抽象如何把“眼前的编码负担”转移为“身后的分层底座复杂性”。
 */
export function ComplexityShift({
  title = "复杂性守恒：负担去了哪里？",
  subtitle = "拖动演进滑块，观察使用者认知负担下降的同时，底层与生态基础设施如何接管复杂性。",
  defaultIndex = 0,
  stages,
}: ComplexityShiftProps) {
  const safeStages = Array.isArray(stages) ? stages : [];
  const clampIndex = React.useCallback(
    (idx: number) => {
      if (safeStages.length === 0) return 0;
      const rounded = Math.round(idx);
      return Math.min(safeStages.length - 1, Math.max(0, rounded));
    },
    [safeStages.length],
  );

  const [activeIndex, setActiveIndex] = React.useState<number>(() =>
    clampIndex(defaultIndex),
  );

  React.useEffect(() => {
    setActiveIndex((prev) => clampIndex(prev));
  }, [clampIndex]);

  const activeStage = safeStages[activeIndex];
  const highlightedSample = React.useMemo(() => {
    if (!activeStage?.userCode) return null;
    const normalizedLang = normalizeCodeLanguage(activeStage.codeLang);
    let highlighted = activeStage.userCode;
    try {
      highlighted = highlightMarkdownCode(activeStage.userCode, normalizedLang);
    } catch {
      highlighted = activeStage.userCode;
    }
    return {
      raw: activeStage.userCode,
      normalizedLang,
      highlighted,
    };
  }, [activeStage]);

  if (safeStages.length === 0 || !activeStage) {
    return (
      <Alert className="not-prose my-6">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>暂未配置复杂性演进阶段（stages）。</AlertDescription>
      </Alert>
    );
  }

  const userBurden = clampPercent(activeStage.userBurden);
  const hiddenComplexity = clampPercent(activeStage.hiddenComplexity);
  const comprehensionRatio = clampPercent(
    activeStage.comprehensionRatio ??
      Math.max(4, Math.round(100 - hiddenComplexity * 0.9)),
  );
  const hiddenLayers = Array.isArray(activeStage.hiddenLayers)
    ? activeStage.hiddenLayers
    : [];

  return (
    <Card className="not-prose my-8 gap-0 overflow-hidden border-border/70 bg-card/70 py-0 shadow-sm">
      <CardHeader className="gap-4 border-b border-border/60 bg-muted/30 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Scale aria-hidden="true" className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold text-foreground sm:text-lg">
                {title}
              </CardTitle>
              <Badge variant="secondary" className="font-mono text-xs">
                {activeStage.era}
              </Badge>
            </div>
            {subtitle ? (
              <CardDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {subtitle}
              </CardDescription>
            ) : null}
          </div>

          {safeStages.length > 1 ? (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeIndex <= 0}
                onClick={() => setActiveIndex((prev) => clampIndex(prev - 1))}
                className="min-h-11 gap-1 px-3 text-xs sm:min-h-9"
              >
                <ChevronLeft aria-hidden="true" className="size-3.5" />
                上一时代
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeIndex >= safeStages.length - 1}
                onClick={() => setActiveIndex((prev) => clampIndex(prev + 1))}
                className="min-h-11 gap-1 px-3 text-xs sm:min-h-9"
              >
                下一时代
                <ChevronRight aria-hidden="true" className="size-3.5" />
              </Button>
            </div>
          ) : null}
        </div>

        <div
          role="tablist"
          aria-label="选择抽象演进时代"
          className="flex flex-wrap gap-2"
        >
          {safeStages.map((stage, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <Button
                key={stage.id || `${stage.era}-${idx}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                size="sm"
                variant={isSelected ? "default" : "outline"}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  "min-h-11 h-auto max-w-full gap-1.5 px-3 py-2 text-left text-xs whitespace-normal sm:min-h-9 sm:text-sm",
                  !isSelected && "bg-background/80 text-foreground hover:bg-muted",
                )}
              >
                <span className="font-mono opacity-80">{stage.era}</span>
                <span>{stage.label}</span>
              </Button>
            );
          })}
        </div>

        {safeStages.length > 1 ? (
          <div className="space-y-1.5 pt-1">
            <RangeSlider
              min={0}
              max={safeStages.length - 1}
              step={1}
              value={activeIndex}
              onValueChange={(next) => setActiveIndex(clampIndex(next))}
              showTicks
              aria-label="拖动查看不同抽象时代的复杂性分配"
              formatValueText={(idx) => {
                const target = safeStages[clampIndex(idx)];
                return target ? `${target.era} · ${target.label}` : String(idx);
              }}
            />
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="min-w-0 space-y-5 px-4 py-5 sm:px-6">
        {highlightedSample ? (
          <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-border/70 bg-muted/25">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3.5 py-2">
              <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                <Code2 aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
                <span>
                  使用者眼前的表达式（{activeStage.era} · {activeStage.label}）
                </span>
              </div>
              <CopyButton code={highlightedSample.raw} />
            </div>
            <div className="markdown-body min-w-0 max-w-full overflow-x-auto">
              <pre
                className="tm-code m-0 max-w-full overflow-x-auto p-3.5 text-xs leading-6 sm:text-[13px]"
                data-lang={highlightedSample.normalizedLang}
              >
                <code
                  className={`language-${highlightedSample.normalizedLang} border-0 bg-transparent p-0!`}
                  dangerouslySetInnerHTML={{
                    __html: highlightedSample.highlighted,
                  }}
                />
              </pre>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="min-w-0 space-y-2 rounded-lg border border-border/70 bg-background/70 p-3.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">使用者认知负担</span>
              <span className="font-mono font-semibold text-foreground tabular-nums">
                {userBurden}%
              </span>
            </div>
            <Progress value={userBurden} className="h-1.5" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              眼前需要记忆和手写的控制细节
            </p>
          </div>

          <div className="min-w-0 space-y-2 rounded-lg border border-border/70 bg-background/70 p-3.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">底座隐藏复杂度</span>
              <span className="font-mono font-semibold text-foreground tabular-nums">
                {hiddenComplexity}%
              </span>
            </div>
            <Progress value={hiddenComplexity} className="h-1.5" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              转交给编译器、运行时、云底座与依赖链的重量
            </p>
          </div>

          <div className="min-w-0 space-y-2 rounded-lg border border-border/70 bg-background/70 p-3.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">单人可透视全貌比例</span>
              <span className="font-mono font-semibold text-foreground tabular-nums">
                {comprehensionRatio}%
              </span>
            </div>
            <Progress value={comprehensionRatio} className="h-1.5" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              一位工程师能从头推演到底层的程度
            </p>
          </div>
        </div>

        {hiddenLayers.length > 0 ? (
          <div className="rounded-lg border border-border/70 bg-muted/25 p-3.5">
            <div className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Layers aria-hidden="true" className="size-3.5 text-primary" />
              <span>此刻在幕后替你扛活的抽象层（{hiddenLayers.length} 层）</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {hiddenLayers.map((layerName, idx) => (
                <Badge
                  key={`${layerName}-${idx}`}
                  variant="secondary"
                  className="max-w-full whitespace-normal text-left text-xs font-normal"
                >
                  {layerName}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <Alert className="border-border/70 bg-muted/25">
          <Scale aria-hidden="true" className="size-4 text-primary" />
          <AlertTitle className="text-xs font-semibold text-foreground sm:text-sm">
            {activeStage.era} 时代的得与失
          </AlertTitle>
          <AlertDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {activeStage.takeaway}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
