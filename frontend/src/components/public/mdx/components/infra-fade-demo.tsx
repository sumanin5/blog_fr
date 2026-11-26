"use client";

import React, { useId, useState } from "react";
import { AlertCircle, AlertTriangle, Eye, EyeOff, Layers } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { clampPercentage, LabMeter } from "../utils/lab-primitives";

export interface InfraStage {
  phase: string;
  userFocus: string;
  consciousnessLoad: number;
  hiddenScale: number;
  backgroundLayers: string[];
}

export interface InfraBreakdown {
  triggerLabel: string;
  symptom: string;
  exposedLayers: string[];
  takeaway: string;
}

export interface InfraScenario {
  id: string;
  label: string;
  stages: InfraStage[];
  breakdown: InfraBreakdown;
}

export interface InfraFadeDemoProps {
  title?: string;
  subtitle?: string;
  defaultStageIndex?: number;
  scenarios: InfraScenario[];
}

/**
 * 技术隐形化与“故障显形”模拟器：
 * 展示技术成熟度升高时意识负担与幕后规模的反比演进，以及故障瞬间上手态坍塌的反转。
 */
export function InfraFadeDemo({
  title = "技术隐形化与“故障显形”模拟器",
  subtitle = "拖动演进阶段并拨动底层故障开关，观察“隐入背景的设施”如何在崩溃瞬间重新占满意识焦点。",
  defaultStageIndex = 2,
  scenarios,
}: InfraFadeDemoProps) {
  const faultSwitchId = useId();
  const safeScenarios = Array.isArray(scenarios) ? scenarios : [];
  const [scenarioId, setScenarioId] = useState<string>(
    safeScenarios[0]?.id ?? "",
  );
  const [rawStageIndex, setRawStageIndex] = useState<number>(defaultStageIndex);
  const [isFaultActive, setIsFaultActive] = useState<boolean>(false);

  if (safeScenarios.length === 0) {
    return (
      <Alert className="not-prose my-6 border-border/70 bg-card/70">
        <AlertCircle aria-hidden="true" className="size-4 text-muted-foreground" />
        <AlertTitle>未配置基础设施场景</AlertTitle>
        <AlertDescription>
          请为 InfraFadeDemo 传入至少 1 个 scenarios 数据项。
        </AlertDescription>
      </Alert>
    );
  }

  const activeScenario =
    safeScenarios.find((item) => item.id === scenarioId) ?? safeScenarios[0];
  const stages = Array.isArray(activeScenario.stages)
    ? activeScenario.stages
    : [];
  const maxStageIndex = Math.max(0, stages.length - 1);
  const stageIndex = Math.max(0, Math.min(maxStageIndex, rawStageIndex));
  const activeStage = stages[stageIndex];

  if (!activeStage) {
    return (
      <Alert className="not-prose my-6 border-border/70 bg-card/70">
        <AlertCircle aria-hidden="true" className="size-4 text-muted-foreground" />
        <AlertTitle>阶段数据为空</AlertTitle>
        <AlertDescription>
          当前场景「{activeScenario.label}」未包含有效的 stages 数据。
        </AlertDescription>
      </Alert>
    );
  }

  const normalLoad = clampPercentage(activeStage.consciousnessLoad);
  const effectiveLoad = isFaultActive ? Math.max(normalLoad, 95) : normalLoad;
  const hiddenScale = clampPercentage(activeStage.hiddenScale);
  const backgroundLayers = Array.isArray(activeStage.backgroundLayers)
    ? activeStage.backgroundLayers
    : [];
  const exposedLayers = Array.isArray(activeScenario.breakdown?.exposedLayers)
    ? activeScenario.breakdown.exposedLayers
    : [];

  const handleScenarioChange = (nextId: string) => {
    setScenarioId(nextId);
    setIsFaultActive(false);
    const nextScenario = safeScenarios.find((item) => item.id === nextId);
    const nextMax = Math.max(0, (nextScenario?.stages?.length ?? 1) - 1);
    setRawStageIndex(Math.min(defaultStageIndex, nextMax));
  };

  return (
    <Card className="not-prose my-8 gap-0 overflow-hidden border-border/70 bg-card/70 py-0 shadow-sm">
      <CardHeader className="min-w-0 space-y-3 border-b border-border/60 bg-muted/30 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Layers aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <CardTitle className="text-base font-semibold text-foreground sm:text-lg">
                {title}
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                概念示意
              </Badge>
            </div>
            <CardDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {subtitle}
            </CardDescription>
          </div>

          <Label
            htmlFor={faultSwitchId}
            className={cn(
              "flex min-h-11 shrink-0 cursor-pointer items-center justify-between gap-2.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors sm:min-h-10",
              isFaultActive
                ? "border-destructive/60 bg-card text-foreground"
                : "border-border/80 bg-background/80 text-foreground",
            )}
          >
            <span className="flex items-center gap-1.5">
              {isFaultActive ? (
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full bg-destructive"
                />
              ) : null}
              <span>模拟底层故障</span>
            </span>
            <Switch
              id={faultSwitchId}
              checked={isFaultActive}
              onCheckedChange={setIsFaultActive}
              aria-label={`模拟底层故障：${activeScenario.breakdown.triggerLabel}`}
            />
          </Label>
        </div>

        {safeScenarios.length > 1 ? (
          <Tabs value={activeScenario.id} onValueChange={handleScenarioChange}>
            <TabsList className="h-auto w-full max-w-full flex-wrap justify-start gap-1 overflow-x-auto p-1 sm:w-fit">
              {safeScenarios.map((item) => (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className="min-h-11 px-3 py-2 text-xs sm:min-h-9 sm:text-sm"
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}
      </CardHeader>

      <CardContent className="min-w-0 space-y-5 px-4 py-5 sm:px-6">
        <div className="touch-pan-y space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              成熟度演进阶段
            </span>
            <span className="font-mono text-xs font-semibold text-foreground tabular-nums">
              阶段 {stageIndex + 1}/{stages.length} · {activeStage.phase}
            </span>
          </div>

          <div
            role="tablist"
            aria-label="选择技术成熟度阶段"
            className="flex flex-wrap gap-1.5"
          >
            {stages.map((st, idx) => {
              const isSelected = idx === stageIndex;
              return (
                <Button
                  key={`${activeScenario.id}-stage-${idx}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => setRawStageIndex(idx)}
                  className={cn(
                    "min-h-11 px-3 py-1.5 text-xs sm:min-h-9",
                    !isSelected && "bg-background/80 text-foreground",
                  )}
                >
                  {idx + 1}. {st.phase}
                </Button>
              );
            })}
          </div>

          {stages.length > 1 ? (
            <div className="pt-1">
              <RangeSlider
                min={0}
                max={maxStageIndex}
                step={1}
                value={stageIndex}
                onValueChange={setRawStageIndex}
                showTicks
                aria-label="调整技术成熟度阶段"
                formatValueText={(idx) =>
                  stages[idx]?.phase ?? `阶段 ${idx + 1}`
                }
              />
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="min-w-0 rounded-lg border border-border/70 bg-background/70 p-3.5">
            <LabMeter
              label={
                isFaultActive
                  ? "故障后意识接管负担"
                  : "使用者日常意识负担"
              }
              value={effectiveLoad}
              tag="概念示意"
              tone={isFaultActive ? "destructive" : "primary"}
              hint={
                isFaultActive
                  ? `中断爆发：原本 ${normalLoad}% 的微弱关注瞬间飙升为故障排查负荷`
                  : "工具越成熟，正常使用时需要大脑操心的细节越少"
              }
            />
          </div>

          <div className="min-w-0 rounded-lg border border-border/70 bg-background/70 p-3.5">
            <LabMeter
              label="幕后运行系统规模"
              value={hiddenScale}
              tag="概念示意"
              tone="neutral"
              hint="表层丝滑体验背后持续运转的依赖网与基础设施密度"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div
            className={cn(
              "min-w-0 space-y-3 rounded-lg border border-border/70 bg-background/80 p-4 transition-colors",
              isFaultActive
                ? "border-l-2 border-l-destructive bg-card"
                : "border-l-2 border-l-primary",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-foreground uppercase">
                {isFaultActive ? (
                  <AlertTriangle
                    aria-hidden="true"
                    className="size-4 shrink-0 text-destructive"
                  />
                ) : (
                  <Eye aria-hidden="true" className="size-4 shrink-0 text-primary" />
                )}
                <span>
                  {isFaultActive ? "意识焦点区 · 故障显形" : "意识焦点区"}
                </span>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {isFaultActive ? activeScenario.breakdown.triggerLabel : "上手态"}
              </Badge>
            </div>

            {isFaultActive ? (
              <div className="space-y-2.5">
                <p className="text-sm leading-relaxed font-medium text-foreground">
                  {activeScenario.breakdown.symptom}
                </p>
                {exposedLayers.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                      <span
                        aria-hidden="true"
                        className="size-1.5 rounded-full bg-destructive"
                      />
                      <span>被迫弹出水面的底层依赖</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {exposedLayers.map((layerName, idx) => (
                        <Badge
                          key={`exposed-${idx}`}
                          variant="outline"
                          className="border-destructive/60 font-mono text-xs text-foreground"
                        >
                          {layerName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-foreground">
                {activeStage.userFocus}
              </p>
            )}
          </div>

          <div className="min-w-0 space-y-3 rounded-lg border border-border/70 bg-muted/25 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <EyeOff aria-hidden="true" className="size-4 shrink-0" />
                <span>隐入背景区</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {backgroundLayers.length} 项底座层
              </span>
            </div>

            {backgroundLayers.length === 0 ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                此时系统尚未形成自动化幕后分层，几乎所有环节都直接暴露在操作者眼前。
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {backgroundLayers.map((layerName, idx) => {
                  const isExposed =
                    isFaultActive && exposedLayers.includes(layerName);
                  return (
                    <Badge
                      key={`bg-${idx}`}
                      variant={isExposed ? "outline" : "secondary"}
                      className={cn(
                        "text-xs font-normal",
                        isExposed &&
                          "border-destructive/60 text-foreground opacity-100",
                        isFaultActive && !isExposed && "opacity-55",
                      )}
                    >
                      {isExposed ? "⚠ " : ""}
                      {layerName}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <Alert
          className={cn(
            "border-border/70 bg-muted/25",
            isFaultActive && "border-l-2 border-l-destructive bg-card",
          )}
        >
          <Layers
            aria-hidden="true"
            className={cn(
              "size-4",
              isFaultActive ? "text-destructive" : "text-primary",
            )}
          />
          <AlertTitle className="text-xs font-semibold text-foreground sm:text-sm">
            {isFaultActive
              ? "认知反转：故障撕开“自然无感”的假象"
              : "平稳运转态：功成事遂，百姓皆谓我自然"}
          </AlertTitle>
          <AlertDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {isFaultActive
              ? activeScenario.breakdown.takeaway
              : "只要底层依赖链保持契约稳定，普通使用者就会忘了背后庞大的技术设施，仿佛一切天然如此；切换「模拟底层故障」即可见证它在 1 秒内跌回显性复杂度。"}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
