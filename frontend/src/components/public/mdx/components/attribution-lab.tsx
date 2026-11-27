"use client";

import React, { useId, useState } from "react";
import { AlertCircle, Scale, Users } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
  reliabilityBasis: string;
  handoverBoundary: string;
  fitScenario: string;
  /** @deprecated 已废弃：组件不再渲染任何数值打分或进度条 */
  outputScore?: number;
  /** @deprecated 已废弃：组件不再渲染任何数值打分或进度条 */
  understandingScore?: number;
  /** @deprecated 已废弃：组件不再渲染任何数值打分或进度条 */
  verificationScore?: number;
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

const STATUS_DOT_CLASS: Record<AttributionOutcomeStatus, string> = {
  stable: "bg-success",
  warn: "bg-warning",
  risk: "bg-destructive",
};

/**
 * 同果异因思想实验台：
 * 在相同交付物前提下，以纯定性结构化对照展示不同工作方式的可靠性依据、接管边界与适用风险等级。
 */
export function AttributionLab({
  title = "同果异因思想实验台：可靠性依据与责任边界",
  subtitle = "不同工作方式在验收时刻交出了外观一致的成果；切换真实压力场景，对照各自的可靠性依据、接管边界与实际表现。",
  sharedDeliverable,
  scenarios,
  profiles,
}: AttributionLabProps) {
  const idPrefix = useId();
  const safeScenarios = Array.isArray(scenarios) ? scenarios : [];
  const safeProfiles = Array.isArray(profiles) ? profiles : [];
  const [scenarioId, setScenarioId] = useState<string>(
    safeScenarios[0]?.id ?? "",
  );

  if (safeScenarios.length === 0 || safeProfiles.length === 0) {
    return (
      <Alert className="not-prose my-6 border-border/70 bg-card/70">
        <AlertCircle
          aria-hidden="true"
          className="size-4 text-muted-foreground"
        />
        <AlertTitle>未配置完整的实验对比数据</AlertTitle>
        <AlertDescription>
          请为 AttributionLab 传入 scenarios 与 profiles 数组。
        </AlertDescription>
      </Alert>
    );
  }

  const activeScenario =
    safeScenarios.find((item) => item.id === scenarioId) ?? safeScenarios[0];
  const activeTabId = `${idPrefix}-tab-${activeScenario.id}`;
  const activePanelId = `${idPrefix}-panel`;

  return (
    <Card className="not-prose my-8 gap-0 overflow-hidden border-border/70 bg-card/70 py-0 shadow-sm">
      <CardHeader className="min-w-0 space-y-3 border-b border-border/60 bg-muted/30 px-4 py-4 sm:px-6">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Users aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <CardTitle className="text-base font-semibold text-foreground sm:text-lg">
              {title}
            </CardTitle>
          </div>
          <CardDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {subtitle}
          </CardDescription>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-background/80 px-3.5 py-2.5 text-xs">
          <Badge variant="secondary" className="shrink-0 font-mono text-xs">
            共同交付物
          </Badge>
          <span className="min-w-0 font-medium text-foreground">
            {sharedDeliverable}
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
                  id={`${idPrefix}-tab-${scenario.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={activePanelId}
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
        </div>

        <div
          id={activePanelId}
          role="tabpanel"
          aria-labelledby={activeTabId}
          className="min-w-0 space-y-5"
        >
          <div className="rounded-md border border-border/60 bg-muted/25 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">
              当前场景条件：
            </strong>
            {activeScenario.context}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {safeProfiles.map((profile) => {
              const outcome = profile.outcomesByScenario?.[activeScenario.id];
              const status = outcome?.status ?? "warn";
              const isRisk = status === "risk";
              const qualitativeRows = [
                { label: "工作方式", value: profile.methodSummary },
                { label: "可靠性依据", value: profile.reliabilityBasis },
                { label: "接管边界", value: profile.handoverBoundary },
                { label: "适用风险等级", value: profile.fitScenario },
              ].filter((row) => row.value?.trim());

              return (
                <div
                  key={profile.id}
                  className="flex min-w-0 flex-col justify-between gap-4 rounded-lg border border-border/70 bg-background/85 p-4"
                >
                  <div className="min-w-0 space-y-3">
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

                    <dl className="m-0 divide-y divide-border/50 border-t border-border/50">
                      {qualitativeRows.map((row) => (
                        <div
                          key={row.label}
                          className="space-y-0.5 py-2.5 first:pt-3 last:pb-0"
                        >
                          <dt className="text-xs font-medium text-muted-foreground">
                            {row.label}
                          </dt>
                          <dd className="m-0 text-xs leading-relaxed text-foreground">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  {outcome ? (
                    <div className="min-w-0 space-y-1.5 rounded-md border border-border/60 bg-muted/25 p-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <span
                          aria-hidden="true"
                          data-status={status}
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            STATUS_DOT_CLASS[status],
                          )}
                        />
                        <span
                          className={cn(
                            isRisk ? "text-destructive" : "text-foreground",
                          )}
                        >
                          {STATUS_LABEL[status]}
                        </span>
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
              这一场景揭示了什么
            </AlertTitle>
            <AlertDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {activeScenario.kpiInsight}
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:px-6 [.border-t]:pt-3">
        <span>仅作定性结构化对照，不做人物打分或排序</span>
        <Badge variant="outline" className="shrink-0 font-mono text-xs">
          思想实验示意
        </Badge>
      </CardFooter>
    </Card>
  );
}
