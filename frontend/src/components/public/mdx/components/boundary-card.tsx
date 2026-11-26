"use client";

import * as React from "react";
import { ArrowRightLeft, ShieldAlert, ShieldCheck, Sparkles, Terminal } from "lucide-react";

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

export interface BoundaryCase {
  /** 案例唯一标识 */
  id: string;
  /** Tab 标签文本 */
  label: string;
  /** 边界内：承诺生效的标题 */
  promiseTitle: string;
  /** 边界内：承诺生效的详细说明 */
  promiseDesc: string;
  /** 越界后：抽象泄漏的标题 */
  leakTitle: string;
  /** 越界后：抽象泄漏的表现说明 */
  leakDesc: string;
  /** 可选观测证据 / 反常输出 / 实验数据 */
  artifact?: string;
  /** 底层物理或工程根因 */
  rootCause: string;
}

export interface BoundaryCardProps {
  /** 卡片主标题 */
  title?: string;
  /** 可选副标题 */
  subtitle?: string;
  /** 默认是否处于越界状态，默认 false（边界内） */
  defaultBreached?: boolean;
  /** 案例列表，至少 1 项 */
  cases: BoundaryCase[];
}

/**
 * 抽象边界双态切换卡片：
 * 对比“边界内承诺生效”与“越界后抽象泄漏”的真实反差，并揭示底层根因。
 */
export function BoundaryCard({
  title = "抽象边界对照",
  subtitle = "任何抽象都只在预设前提内成立；一旦越界，底层实现便会穿透表象。",
  defaultBreached = false,
  cases,
}: BoundaryCardProps) {
  const safeCases = React.useMemo(
    () => (Array.isArray(cases) ? cases : []),
    [cases],
  );
  const [activeCaseId, setActiveCaseId] = React.useState<string>(
    safeCases[0]?.id ?? "",
  );
  const [breached, setBreached] = React.useState<boolean>(defaultBreached);
  const switchId = React.useId();

  React.useEffect(() => {
    if (safeCases.length > 0 && !safeCases.some((c) => c.id === activeCaseId)) {
      setActiveCaseId(safeCases[0].id);
    }
  }, [safeCases, activeCaseId]);

  if (safeCases.length === 0) {
    return (
      <Alert className="not-prose my-6">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>暂未配置边界对照案例（cases）。</AlertDescription>
      </Alert>
    );
  }

  const activeCase =
    safeCases.find((item) => item.id === activeCaseId) ?? safeCases[0];

  return (
    <Card className="not-prose my-8 gap-0 overflow-hidden border-border/70 bg-card/70 py-0 shadow-sm">
      <CardHeader className="gap-4 border-b border-border/60 bg-muted/30 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base font-semibold text-foreground sm:text-lg">
                {title}
              </CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium text-foreground transition-colors",
                  breached
                    ? "border-destructive/45 bg-destructive/15"
                    : "border-success/45 bg-success/15",
                )}
              >
                {breached ? "越界 · 抽象泄漏" : "边界内 · 承诺生效"}
              </Badge>
            </div>
            {subtitle ? (
              <CardDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {subtitle}
              </CardDescription>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2.5 rounded-lg border border-border/70 bg-background/80 px-3 py-2 sm:justify-start">
            <Label
              htmlFor={switchId}
              className={cn(
                "cursor-pointer text-xs font-medium transition-colors",
                !breached ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              承诺生效
            </Label>
            <Switch
              id={switchId}
              checked={breached}
              onCheckedChange={setBreached}
              aria-label="切换边界内承诺生效与越界抽象泄漏状态"
            />
            <Label
              htmlFor={switchId}
              className={cn(
                "cursor-pointer text-xs font-medium transition-colors",
                breached ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              越界泄漏
            </Label>
          </div>
        </div>

        {safeCases.length > 1 ? (
          <Tabs value={activeCase.id} onValueChange={setActiveCaseId}>
            <TabsList className="h-auto w-full max-w-full flex-wrap justify-start gap-1 overflow-x-auto p-1 sm:w-fit">
              {safeCases.map((item) => (
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

      <CardContent className="min-w-0 space-y-4 px-4 py-5 sm:px-6">
        <div
          className={cn(
            "min-w-0 rounded-lg border p-4 transition-colors",
            breached
              ? "border-destructive/35 bg-destructive/5"
              : "border-success/35 bg-success/5",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {breached ? (
                <ShieldAlert
                  aria-hidden="true"
                  className="size-4 shrink-0 text-destructive"
                />
              ) : (
                <ShieldCheck
                  aria-hidden="true"
                  className="size-4 shrink-0 text-success"
                />
              )}
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                {breached ? "越界现场 · Promise Broken" : "抽象视图 · Promise Holds"}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBreached((prev) => !prev)}
              className="min-h-11 gap-1.5 px-3 text-xs sm:min-h-9"
            >
              <ArrowRightLeft aria-hidden="true" className="size-3.5" />
              {breached ? "回到边界内" : "模拟越界"}
            </Button>
          </div>

          <h4 className="mt-2.5 text-base font-semibold text-foreground">
            {breached ? activeCase.leakTitle : activeCase.promiseTitle}
          </h4>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {breached ? activeCase.leakDesc : activeCase.promiseDesc}
          </p>
        </div>

        {activeCase.artifact ? (
          <div
            className={cn(
              "min-w-0 max-w-full rounded-lg border px-3.5 py-3 transition-colors",
              breached
                ? "border-destructive/30 bg-muted/60"
                : "border-border/60 bg-muted/30",
            )}
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Terminal aria-hidden="true" className="size-3.5 shrink-0" />
              <span>{breached ? "越界观测输出" : "实验现场对照样本"}</span>
            </div>
            <pre className="max-w-full overflow-x-auto font-mono text-xs leading-relaxed text-foreground sm:text-sm">
              <code>{activeCase.artifact}</code>
            </pre>
          </div>
        ) : null}

        <Alert
          className={cn(
            "transition-colors",
            breached
              ? "border-warning/40 bg-warning/10"
              : "border-border/70 bg-muted/25",
          )}
        >
          <Sparkles aria-hidden="true" className="size-4 text-primary" />
          <AlertTitle className="text-xs font-semibold tracking-wide text-foreground sm:text-sm">
            {breached ? "底层物理 / 工程根因（已穿透）" : "潜在边界前提"}
          </AlertTitle>
          <AlertDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {breached
              ? activeCase.rootCause
              : "当前处于该抽象层设计的安全区内部；点击上方开关或“模拟越界”即可触发真实的底层穿透现象。"}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
