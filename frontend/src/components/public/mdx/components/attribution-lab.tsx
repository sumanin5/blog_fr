"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Scale, Users } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { LabMeter } from "../utils/lab-primitives";

export type AttributionOutcomeStatus = "stable" | "warn" | "risk";

export interface AttributionScenarioOutcome {
  status: AttributionOutcomeStatus;
  headline: string;
  detail: string;
}

export interface AttributionScenario {
  id: string;
  label: string;
  context: string;
  kpiInsight: string;
}

export interface AttributionProfile {
  id: string;
  name: string;
  roleTag: string;
  methodSummary: string;
  outputScore: number;
  understandingScore: number;
  verificationScore: number;
  outcomesByScenario: Record<string, AttributionScenarioOutcome>;
}

export interface AttributionLabProps {
  title?: string;
  subtitle?: string;
  sharedDeliverable: string;
  scenarios: AttributionScenario[];
  profiles: AttributionProfile[];
}

const STATUS_LABEL: Record<AttributionOutcomeStatus, string> = {
  stable: "可控稳态",
  warn: "需人工补位",
  risk: "风险失控",
};

/**
 * 同果异因思想实验台：
 * 相同表观产出下，拆解独立实现 / AI 深度掌控 / AI 黑盒交付在压力场景中的真实分化。
 */
export function AttributionLab({
  title = "同果异因思想实验台：产出、理解与责任归属",
  subtitle = "三名开发者在验收时刻交出了完全一致的成果；切换真实工程压力场景，观察隐性能力的分水岭。",
  sharedDeliverable,
  scenarios,
  profiles,
}: AttributionLabProps) {
  const safeScenarios = Array.isArray(scenarios) ? scenarios : [];
  const safeProfiles = Array.isArray(profiles) ? profiles : [];
  const [scenarioId, setScenarioId] = useState<string>(
    safeScenarios[0]?.id ?? "",
  );

  if (safeScenarios.length === 0 || safeProfiles.length === 0) {
    return (
      <Alert className="not-prose my-6 border-border/70 bg-card/70">
        <AlertCircle aria-hidden="true" className="size-4 text-muted-foreground" />
        <AlertTitle>未配置完整的实验对比数据</AlertTitle>
        <AlertDescription>
          请为 AttributionLab 传入 scenarios 与 profiles 数组。
        </AlertDescription>
      </Alert>
    );
  }

  const activeScenario =
    safeScenarios.find((item) => item.id === scenarioId) ?? safeScenarios[0];

  return (
    <Card className="not-prose my-8 gap-0 overflow-hidden border-border/70 bg-card/70 py-0 shadow-sm">
      <CardHeader className="min-w-0 space-y-3 border-b border-border/60 bg-muted/30 px-4 py-4 sm:px-6">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Users aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <CardTitle className="text-base font-semibold text-foreground sm:text-lg">
              {title}
            </CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              思想实验示意
            </Badge>
          </div>
          <CardDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {subtitle}
          </CardDescription>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/80 px-3.5 py-2.5 text-xs">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge variant="secondary" className="shrink-0 font-mono text-xs">
              共同交付物（100% 一致）
            </Badge>
            <span className="min-w-0 font-medium text-foreground">
              {sharedDeliverable}
            </span>
          </div>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            以下刻度仅作思想实验对比示意
          </span>
        </div>
      </CardHeader>

      <CardContent className="min-w-0 space-y-5 px-4 py-5 sm:px-6">
        <div className="min-w-0 space-y-2.5">
          <div
            role="tablist"
            aria-label="选择工程压力测试场景"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {safeScenarios.map((scenario) => {
              const isSelected = scenario.id === activeScenario.id;
              return (
                <Button
                  key={scenario.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => setScenarioId(scenario.id)}
                  className={cn(
                    "min-h-11 h-auto min-w-0 px-3 py-2 text-center text-xs whitespace-normal sm:text-sm",
                    !isSelected && "bg-background/80 text-foreground",
                  )}
                >
                  {scenario.label}
                </Button>
              );
            })}
          </div>

          <div className="rounded-md border border-border/60 bg-muted/25 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">
              当前场景条件：
            </strong>
            {activeScenario.context}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {safeProfiles.map((profile) => {
            const outcome = profile.outcomesByScenario?.[activeScenario.id];
            const status = outcome?.status ?? "warn";
            const isRisk = status === "risk";
            const isStable = status === "stable";

            return (
              <div
                key={profile.id}
                className={cn(
                  "flex min-w-0 flex-col justify-between gap-4 rounded-lg border border-border/70 bg-background/85 p-4",
                  isRisk && "border-l-2 border-l-destructive bg-card",
                  isStable && "border-l-2 border-l-primary",
                )}
              >
                <div className="min-w-0 space-y-3.5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        {profile.name}
                      </h4>
                      <Badge
                        variant="outline"
                        className="shrink-0 font-mono text-xs"
                      >
                        {profile.roleTag}
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {profile.methodSummary}
                    </p>
                  </div>

                  <div className="space-y-2.5 border-t border-border/50 pt-3">
                    <LabMeter
                      label="表观产出（功能结果）"
                      value={profile.outputScore}
                      tone="neutral"
                    />
                    <LabMeter
                      label="系统理解深度"
                      value={profile.understandingScore}
                      tone={profile.understandingScore < 40 ? "destructive" : "primary"}
                    />
                    <LabMeter
                      label="可验证与接管能力"
                      value={profile.verificationScore}
                      tone={profile.verificationScore < 40 ? "destructive" : "primary"}
                    />
                  </div>
                </div>

                {outcome ? (
                  <div
                    className={cn(
                      "min-w-0 space-y-1.5 rounded-md border border-border/60 bg-muted/25 p-3",
                      isRisk && "border-l-2 border-l-destructive bg-card",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        {isRisk ? (
                          <span
                            aria-hidden="true"
                            className="size-2 shrink-0 rounded-full bg-destructive"
                          />
                        ) : isStable ? (
                          <CheckCircle2
                            aria-hidden="true"
                            className="size-3.5 shrink-0 text-primary"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="size-2 shrink-0 rounded-full bg-primary"
                          />
                        )}
                        <span className={cn(isRisk && "text-destructive")}>
                          {STATUS_LABEL[status]}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-foreground">
                      {outcome.headline}
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {outcome.detail}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <Alert className="border-border/70 bg-muted/25">
          <Scale aria-hidden="true" className="size-4 text-primary" />
          <AlertTitle className="text-xs font-semibold text-foreground sm:text-sm">
            当前场景的 KPI 评估盲区
          </AlertTitle>
          <AlertDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {activeScenario.kpiInsight}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
