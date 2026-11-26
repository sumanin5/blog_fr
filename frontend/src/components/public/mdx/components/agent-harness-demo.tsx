"use client";

import React, { useId, useState } from "react";
import {
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Wrench,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { LabMeter } from "../utils/lab-primitives";

export type AgentHarnessStage = "parse" | "generate" | "execute" | "commit";

export interface AgentGuardrail {
  id: string;
  label: string;
  category: string;
  defaultEnabled?: boolean;
  preventsRisk: string;
  exposedRisk: string;
  stage: AgentHarnessStage;
}

export interface AgentHarnessDemoProps {
  title?: string;
  subtitle?: string;
  taskPrompt: string;
  guardrails: AgentGuardrail[];
}

const PIPELINE_STAGES: Array<{
  key: AgentHarnessStage;
  step: string;
  title: string;
}> = [
  { key: "parse", step: "01", title: "意图解析" },
  { key: "generate", step: "02", title: "生成方案" },
  { key: "execute", step: "03", title: "工具执行" },
  { key: "commit", step: "04", title: "现实落盘" },
];

const STAGE_LABEL_MAP: Record<AgentHarnessStage, string> = {
  parse: "意图解析",
  generate: "生成方案",
  execute: "工具执行",
  commit: "现实落盘",
};

/**
 * AI Agent 确定性工程护栏闭环实验：
 * 自由启停 Schema / Sandbox / Evals / Tracing / 人工审批护栏，实时对照 4 阶段风险拦截状态。
 */
export function AgentHarnessDemo({
  title = "AI Agent 确定性工程护栏闭环实验",
  subtitle = "大模型本质是概率引擎，生产可靠性来自外围的确定性边界。逐个拆掉或补齐护栏，查看风险从哪个执行阶段漏出。",
  taskPrompt,
  guardrails,
}: AgentHarnessDemoProps) {
  const switchPrefix = useId();
  const safeGuardrails = Array.isArray(guardrails) ? guardrails : [];

  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of safeGuardrails) {
      initial[item.id] = item.defaultEnabled !== false;
    }
    return initial;
  });

  if (safeGuardrails.length === 0) {
    return (
      <Alert className="not-prose my-6 border-border/70 bg-card/70">
        <AlertCircle aria-hidden="true" className="size-4 text-muted-foreground" />
        <AlertTitle>未配置工程护栏条目</AlertTitle>
        <AlertDescription>
          请为 AgentHarnessDemo 传入至少 1 个 guardrails 数据项。
        </AlertDescription>
      </Alert>
    );
  }

  const isEnabled = (item: AgentGuardrail) => Boolean(enabledMap[item.id]);
  const enabledCount = safeGuardrails.filter(isEnabled).length;
  const controllabilityScore = Math.round(
    (enabledCount / safeGuardrails.length) * 100,
  );
  const allOff = enabledCount === 0;
  const allOn = enabledCount === safeGuardrails.length;

  const setAllGuardrails = (value: boolean) => {
    const next: Record<string, boolean> = {};
    for (const item of safeGuardrails) {
      next[item.id] = value;
    }
    setEnabledMap(next);
  };

  const toggleGuardrail = (id: string, checked: boolean) => {
    setEnabledMap((prev) => ({
      ...prev,
      [id]: checked,
    }));
  };

  return (
    <Card className="not-prose my-8 gap-0 overflow-hidden border-border/70 bg-card/70 py-0 shadow-sm">
      <CardHeader className="min-w-0 space-y-3 border-b border-border/60 bg-muted/30 px-4 py-4 sm:px-6">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Wrench aria-hidden="true" className="size-4 shrink-0 text-primary" />
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

        <div className="min-w-0 rounded-lg border border-border/70 bg-background/85 px-3.5 py-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Terminal aria-hidden="true" className="size-3.5 shrink-0" />
            <span>待执行 Agent 任务指令</span>
          </div>
          <p className="font-mono text-xs leading-relaxed text-foreground sm:text-sm">
            {taskPrompt}
          </p>
        </div>
      </CardHeader>

      <CardContent className="min-w-0 space-y-5 px-4 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          <div className="min-w-0 space-y-3 md:col-span-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide text-foreground uppercase">
                确定性护栏开关
              </span>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                已启用 {enabledCount}/{safeGuardrails.length}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={allOff ? "default" : "outline"}
                onClick={() => setAllGuardrails(false)}
                className="min-h-11 h-auto px-2.5 py-2 text-xs whitespace-normal"
              >
                全关（裸奔）
              </Button>
              <Button
                type="button"
                size="sm"
                variant={allOn ? "default" : "outline"}
                onClick={() => setAllGuardrails(true)}
                className="min-h-11 h-auto px-2.5 py-2 text-xs whitespace-normal"
              >
                全开（生产护栏）
              </Button>
            </div>

            <div className="space-y-2">
              {safeGuardrails.map((item) => {
                const active = isEnabled(item);
                const controlId = `${switchPrefix}-${item.id}`;

                return (
                  <Label
                    key={item.id}
                    htmlFor={controlId}
                    className={cn(
                      "flex min-h-11 min-w-0 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/80 px-3 py-2.5 transition-colors",
                      active
                        ? "border-l-2 border-l-primary"
                        : "border-l-2 border-l-destructive bg-card",
                    )}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {!active ? (
                          <span
                            aria-hidden="true"
                            className="size-1.5 shrink-0 rounded-full bg-destructive"
                          />
                        ) : null}
                        <span className="text-xs font-semibold text-foreground sm:text-sm">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="px-1.5 py-0 font-mono text-xs font-normal"
                        >
                          {item.category}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0 text-xs font-normal text-muted-foreground"
                        >
                          {STAGE_LABEL_MAP[item.stage]}
                        </Badge>
                      </div>
                    </div>

                    <Switch
                      id={controlId}
                      checked={active}
                      onCheckedChange={(checked) =>
                        toggleGuardrail(item.id, checked)
                      }
                      aria-label={`${item.label}（${item.category}）`}
                    />
                  </Label>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 space-y-3 md:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide text-foreground uppercase">
                四阶段执行流水线实时风险观测
              </span>
              <span
                className={cn(
                  "font-mono text-xs font-medium tabular-nums",
                  allOn ? "text-foreground" : "text-destructive",
                )}
              >
                {allOn
                  ? "0 处暴露缺口"
                  : `${safeGuardrails.length - enabledCount} 处缺口暴露`}
              </span>
            </div>

            <div className="space-y-2.5">
              {PIPELINE_STAGES.map((stageMeta) => {
                const stageGuardrails = safeGuardrails.filter(
                  (item) => item.stage === stageMeta.key,
                );
                const exposedItems = stageGuardrails.filter(
                  (item) => !isEnabled(item),
                );
                const protectedItems = stageGuardrails.filter(isEnabled);
                const hasExposure = exposedItems.length > 0;

                return (
                  <div
                    key={stageMeta.key}
                    className={cn(
                      "min-w-0 space-y-2 rounded-lg border border-border/70 bg-background/85 p-3.5 transition-colors",
                      stageGuardrails.length === 0
                        ? "border-border/60"
                        : hasExposure
                          ? "border-l-2 border-l-destructive bg-card"
                          : "border-l-2 border-l-primary",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-muted-foreground tabular-nums">
                          {stageMeta.step}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {stageMeta.title}
                        </span>
                      </div>

                      {stageGuardrails.length === 0 ? (
                        <Badge variant="outline" className="text-xs">
                          无关联护栏
                        </Badge>
                      ) : hasExposure ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-destructive">
                          <ShieldAlert aria-hidden="true" className="size-3.5" />
                          失控缺口 ({exposedItems.length})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-primary">
                          <ShieldCheck aria-hidden="true" className="size-3.5" />
                          已拦截 ({protectedItems.length})
                        </span>
                      )}
                    </div>

                    {exposedItems.length > 0 ? (
                      <ul className="m-0 list-none space-y-1.5 p-0">
                        {exposedItems.map((item) => (
                          <li
                            key={`exposed-${item.id}`}
                            className="flex items-start gap-2 text-xs leading-relaxed text-foreground"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive"
                            />
                            <span>
                              <strong className="font-medium text-destructive">
                                未拦截 [{item.label}]：
                              </strong>
                              {item.exposedRisk}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {protectedItems.length > 0 ? (
                      <ul className="m-0 list-none space-y-1.5 p-0">
                        {protectedItems.map((item) => (
                          <li
                            key={`ok-${item.id}`}
                            className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                            />
                            <span>
                              <strong className="font-medium text-foreground">
                                已启用 [{item.label}]：
                              </strong>
                              {item.preventsRisk}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border/70 bg-muted/25 p-3.5">
          <LabMeter
            label="可控交付闭环刻度"
            value={controllabilityScore}
            tag="概念示意"
            tone={allOff || controllabilityScore < 50 ? "destructive" : "primary"}
          />
          <Alert className="border-border/60 bg-background/80 py-2.5">
            {allOn ? (
              <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
            ) : (
              <ShieldAlert
                aria-hidden="true"
                className={cn(
                  "size-4",
                  allOff ? "text-destructive" : "text-muted-foreground",
                )}
              />
            )}
            <AlertTitle className="text-xs font-semibold text-foreground sm:text-sm">
              {allOff
                ? "完全裸奔态：概率推测直接触达现实副作用"
                : allOn
                  ? "生产级 Harness 闭环：概率内核被确定性外骨骼包裹"
                  : `局部防护态（${enabledCount}/${safeGuardrails.length}）：未覆盖阶段仍存在概率外溢风险`}
            </AlertTitle>
            <AlertDescription className="text-xs leading-relaxed text-muted-foreground">
              {allOff
                ? "当前未激活任何工程约束，Agent 的每一步结构幻觉或越界指令都会直通下游执行与落盘阶段。"
                : allOn
                  ? "即使模型本身存在随机波动，前置 Schema 校验、隔离沙箱、回归测试、全链路追踪与高危人工确认共同锁住了系统安全下限。"
                  : "单靠 Prompt 叮嘱无法封堵运行时失控；请逐项开启右侧标注红点的缺失阶段护栏，补齐闭环。"}
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
