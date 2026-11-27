"use client";

import React, { useState } from "react";
import { AlertCircle, Boxes, Layers, Scissors, Sparkles } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type AbstractionExtractorMode = "raw" | "abstracted" | "loss";

export interface AbstractionInstance {
  label: string;
  keptTrait: string;
  droppedTraits: string[];
  sample?: string;
}

export interface AbstractionExtractedModel {
  name: string;
  contract: string;
  example?: string;
}

export interface AbstractionMereLossModel {
  name: string;
  consequence: string;
}

export interface AbstractionScenario {
  id: string;
  label: string;
  targetGoal: string;
  instances: AbstractionInstance[];
  extractedModel: AbstractionExtractedModel;
  mereLossModel: AbstractionMereLossModel;
}

export interface AbstractionExtractorProps {
  title?: string;
  subtitle?: string;
  defaultMode?: AbstractionExtractorMode;
  scenarios: AbstractionScenario[];
}

const MODE_OPTIONS: Array<{
  id: AbstractionExtractorMode;
  label: string;
  shortDesc: string;
}> = [
  {
    id: "raw",
    label: "1. 原始现实",
    shortDesc: "保留所有表层细节与具体差异",
  },
  {
    id: "abstracted",
    label: "2. 结构抽象",
    shortDesc: "剥离非目标噪声，保留可组合契约",
  },
  {
    id: "loss",
    label: "3. 单纯信息丢失",
    shortDesc: "信息同样变少，却破坏原有推理能力",
  },
];

/**
 * 结构提取与“真抽象 vs 纯信息丢失”演示器。
 * 全客户端纯 Props 驱动，无回调函数跨 RSC 边界。
 */
export function AbstractionExtractor({
  title = "结构提取实验：真抽象 vs 单纯信息丢失",
  subtitle = "切换同一组实例的三种观测视角，辨别哪些信息该丢弃、哪些共享结构必须被保留。",
  defaultMode = "raw",
  scenarios,
}: AbstractionExtractorProps) {
  const safeScenarios = Array.isArray(scenarios) ? scenarios : [];
  const [scenarioId, setScenarioId] = useState<string>(
    safeScenarios[0]?.id ?? "",
  );
  const [mode, setMode] = useState<AbstractionExtractorMode>(defaultMode);

  if (safeScenarios.length === 0) {
    return (
      <Alert className="not-prose my-6 border-border/70 bg-card/70">
        <AlertCircle aria-hidden="true" className="size-4 text-muted-foreground" />
        <AlertTitle>未配置对比场景</AlertTitle>
        <AlertDescription>
          请为 AbstractionExtractor 传入至少 1 个 scenarios 数据项。
        </AlertDescription>
      </Alert>
    );
  }

  const activeScenario =
    safeScenarios.find((item) => item.id === scenarioId) ?? safeScenarios[0];
  const instances = Array.isArray(activeScenario.instances)
    ? activeScenario.instances
    : [];
  const instancesGridClass =
    instances.length <= 2
      ? "grid grid-cols-1 gap-3 md:grid-cols-2"
      : "grid grid-cols-1 gap-3 md:grid-cols-3";

  const activeModeMeta =
    MODE_OPTIONS.find((item) => item.id === mode) ?? MODE_OPTIONS[0];

  return (
    <Card className="not-prose my-8 gap-0 overflow-hidden border-border/70 bg-card/70 py-0 shadow-sm">
      <CardHeader className="min-w-0 space-y-3 border-b border-border/60 bg-muted/30 px-4 py-4 sm:px-6">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Boxes aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <CardTitle className="text-base font-semibold text-foreground sm:text-lg">
              {title}
            </CardTitle>
            <Badge variant="secondary" className="font-mono text-xs">
              Extraction
            </Badge>
          </div>
          <CardDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {subtitle}
          </CardDescription>
        </div>

        {safeScenarios.length > 1 ? (
          <Tabs value={activeScenario.id} onValueChange={setScenarioId}>
            <TabsList className="h-auto w-full max-w-full flex-wrap justify-start gap-1 overflow-x-auto p-1 sm:w-fit">
              {safeScenarios.map((item) => (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className="min-h-11 max-w-full whitespace-normal px-3 py-2 text-left text-xs sm:min-h-9 sm:text-center sm:text-sm"
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}

        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/70 px-3 py-2 text-xs">
          <span className="shrink-0 font-semibold text-muted-foreground">
            当前目标问题
          </span>
          <span className="min-w-0 text-foreground">
            {activeScenario.targetGoal}
          </span>
        </div>
      </CardHeader>

      <CardContent className="min-w-0 space-y-5 px-4 py-5 sm:px-6">
        <div className="min-w-0 space-y-2">
          <div
            role="tablist"
            aria-label="切换信息抽象程度"
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            {MODE_OPTIONS.map((option) => {
              const isSelected = option.id === mode;
              return (
                <Button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => setMode(option.id)}
                  className={cn(
                    "min-h-11 h-auto min-w-0 justify-start gap-2 px-3 py-2 text-left text-xs whitespace-normal sm:justify-center sm:text-center sm:text-sm",
                    !isSelected && "bg-background/80 text-foreground",
                  )}
                >
                  <span className="font-medium">{option.label}</span>
                </Button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            观测状态：{activeModeMeta.shortDesc}
          </p>
        </div>

        {instances.length > 0 ? (
          <div className={instancesGridClass}>
            {instances.map((inst, idx) => {
              const dropped = Array.isArray(inst.droppedTraits)
                ? inst.droppedTraits
                : [];
              const isAbstracted = mode === "abstracted";
              const isLoss = mode === "loss";

              return (
                <div
                  key={`${activeScenario.id}-inst-${idx}`}
                  className={cn(
                    "flex min-w-0 flex-col justify-between gap-3 rounded-lg border border-border/70 bg-background/80 p-3.5 transition-colors",
                    isAbstracted && "border-l-2 border-l-primary",
                    isLoss && "border-l-2 border-l-destructive bg-card",
                  )}
                >
                  <div className="min-w-0 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {inst.label}
                      </span>
                      <Badge
                        variant="outline"
                        className="shrink-0 font-mono text-xs"
                      >
                        {isAbstracted
                          ? "结构保留"
                          : isLoss
                            ? "结构破坏"
                            : "完整实体"}
                      </Badge>
                    </div>

                    <div
                      className={cn(
                        "rounded-md border px-2.5 py-2 text-xs transition-opacity",
                        isAbstracted
                          ? "border-primary/40 bg-primary/5 text-foreground"
                          : isLoss
                            ? "border-border/50 bg-muted/30 text-muted-foreground line-through opacity-55"
                            : "border-border/70 bg-muted/30 text-foreground",
                      )}
                    >
                      <div className="mb-0.5 text-xs font-medium text-muted-foreground">
                        {isLoss ? "被误删的关键不变式" : "核心结构 / 目标关系"}
                      </div>
                      <div className="font-medium">{inst.keptTrait}</div>
                    </div>

                    {dropped.length > 0 ? (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          {mode === "raw"
                            ? "表层具体属性（干扰细节）"
                            : "非目标表层细节（已忽略）"}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {dropped.map((trait, tIdx) => (
                            <Badge
                              key={`${idx}-trait-${tIdx}`}
                              variant="secondary"
                              className={cn(
                                "max-w-full whitespace-normal text-left text-xs font-normal transition-opacity",
                                mode !== "raw" &&
                                  "line-through opacity-45",
                              )}
                            >
                              {trait}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {inst.sample ? (
                    <pre className="m-0 max-w-full overflow-x-auto rounded-md border border-border/60 bg-muted/35 p-2.5 font-mono text-xs leading-relaxed text-foreground">
                      <code>{inst.sample}</code>
                    </pre>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {mode === "raw" ? (
          <Alert className="border-border/70 bg-muted/25">
            <Layers aria-hidden="true" className="size-4 text-muted-foreground" />
            <AlertTitle className="text-xs font-semibold text-foreground sm:text-sm">
              原始观察结论：每个实例都被当成孤立个案
            </AlertTitle>
            <AlertDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              此时没有任何信息丢失，但大脑必须同时扛住所有颜色、材质或底层内存布局细节，很难直接跨场景复用规律。点击「2. 结构抽象」观察提取效果。
            </AlertDescription>
          </Alert>
        ) : null}

        {mode === "abstracted" ? (
          <div className="min-w-0 space-y-3 rounded-lg border border-border/70 border-l-2 border-l-primary bg-muted/25 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                已抽离共享结构 · True Abstraction
              </span>
              <Badge variant="outline" className="font-mono text-xs text-foreground">
                {activeScenario.extractedModel.name}
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              {activeScenario.extractedModel.contract}
            </p>
            {activeScenario.extractedModel.example ? (
              <pre className="m-0 max-w-full overflow-x-auto rounded-md border border-border/60 bg-background/85 p-3 font-mono text-xs leading-relaxed text-foreground">
                <code>{activeScenario.extractedModel.example}</code>
              </pre>
            ) : null}
          </div>
        ) : null}

        {mode === "loss" ? (
          <div className="min-w-0 space-y-2.5 rounded-lg border border-border/70 border-l-2 border-l-destructive bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full bg-destructive"
              />
              <Scissors aria-hidden="true" className="size-4 shrink-0 text-destructive" />
              <span className="text-xs font-semibold tracking-wide text-destructive uppercase">
                结构坍塌 · Mere Information Loss
              </span>
              <Badge variant="outline" className="font-mono text-xs text-foreground">
                {activeScenario.mereLossModel.name}
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              {activeScenario.mereLossModel.consequence}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
