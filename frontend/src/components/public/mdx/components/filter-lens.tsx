"use client";

import * as React from "react";
import { Eye, EyeOff, Filter, Sparkles } from "lucide-react";

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

export interface FilterLensMetric {
  /** 指标名称 */
  label: string;
  /** 指标读数 */
  value: string;
  /** 可选状态徽章 */
  badge?: string;
}

export interface FilterLensOmittedItem {
  /** 被忽略维度标签（如：隐性代价 / 团队协作 / 长尾异常） */
  tag: string;
  /** 被折叠或抹去的真实事件标题 */
  title: string;
  /** 详细描述 */
  detail: string;
  /** 可选隐性成本提示 */
  cost?: string;
}

export interface FilterLensScenario {
  id: string;
  label: string;
  metrics: FilterLensMetric[];
  omittedItems: FilterLensOmittedItem[];
  insightWhenFiltered?: string;
  insightWhenRevealed?: string;
}

export interface FilterLensProps {
  /** 主标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 默认是否开启抽象滤镜，默认 true（先展示整洁报表，再由读者“摘下滤镜”） */
  defaultFiltered?: boolean;
  /** 开启滤镜标签 */
  filterOnLabel?: string;
  /** 摘下滤镜标签 */
  filterOffLabel?: string;
  /** 单场景模式：模型保留下来的核心指标 */
  metrics?: FilterLensMetric[];
  /** 单场景模式：被抽象滤镜抹去的真实细节 */
  omittedItems?: FilterLensOmittedItem[];
  /** 开启滤镜时底部短注 */
  insightWhenFiltered?: string;
  /** 摘下滤镜时底部反思结语 */
  insightWhenRevealed?: string;
  /** 可选多场景切换（传入后将覆盖单场景字段渲染顶部 Tabs） */
  scenarios?: FilterLensScenario[];
}

/**
 * 认知滤镜 / “看见与看不见”对比器：
 * 对比抽象模型保留的高光指标与它主动过滤掉的现实纹理。
 */
export function FilterLens({
  title = "认知滤镜：看见什么，与忽略什么",
  subtitle = "任何指标和模型都在筛选注意力——关闭滤镜，看看被报表省略的现实长什么样。",
  defaultFiltered = true,
  filterOnLabel = "开启抽象滤镜（报表视角）",
  filterOffLabel = "摘下滤镜（看见被忽略的现实）",
  metrics = [],
  omittedItems = [],
  insightWhenFiltered = "在模型与报表视角里，数字清晰可控；所有难以量化的代价与摩擦都被礼貌地折叠了。",
  insightWhenRevealed = "模型之所以好用，正是因为它替你忽略了这些细节；但所有被忽略的成本，并不会凭空消失。",
  scenarios,
}: FilterLensProps) {
  const normalizedScenarios = React.useMemo<FilterLensScenario[]>(() => {
    if (Array.isArray(scenarios) && scenarios.length > 0) {
      return scenarios;
    }
    if (metrics.length > 0 || omittedItems.length > 0) {
      return [
        {
          id: "default",
          label: "当前场景",
          metrics,
          omittedItems,
          insightWhenFiltered,
          insightWhenRevealed,
        },
      ];
    }
    return [];
  }, [
    scenarios,
    metrics,
    omittedItems,
    insightWhenFiltered,
    insightWhenRevealed,
  ]);

  const [activeScenarioId, setActiveScenarioId] = React.useState<string>(
    normalizedScenarios[0]?.id ?? "",
  );
  const [filtered, setFiltered] = React.useState<boolean>(defaultFiltered);
  const switchId = React.useId();

  React.useEffect(() => {
    if (
      normalizedScenarios.length > 0 &&
      !normalizedScenarios.some((item) => item.id === activeScenarioId)
    ) {
      setActiveScenarioId(normalizedScenarios[0].id);
    }
  }, [normalizedScenarios, activeScenarioId]);

  if (normalizedScenarios.length === 0) {
    return (
      <Alert className="not-prose my-6">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          暂未配置过滤对照数据（请传入 metrics 与 omittedItems 或 scenarios）。
        </AlertDescription>
      </Alert>
    );
  }

  const activeScenario =
    normalizedScenarios.find((item) => item.id === activeScenarioId) ??
    normalizedScenarios[0];

  const activeMetrics = activeScenario.metrics ?? [];
  const activeOmitted = activeScenario.omittedItems ?? [];
  const activeFilteredInsight =
    activeScenario.insightWhenFiltered ?? insightWhenFiltered;
  const activeRevealedInsight =
    activeScenario.insightWhenRevealed ?? insightWhenRevealed;

  return (
    <Card className="not-prose my-8 gap-0 overflow-hidden border-border/70 bg-card/70 py-0 shadow-sm">
      <CardHeader className="min-w-0 gap-4 border-b border-border/60 bg-muted/30 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Filter aria-hidden="true" className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold text-foreground sm:text-lg">
                {title}
              </CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium text-foreground transition-colors",
                  filtered
                    ? "border-info/45 bg-info/15"
                    : "border-warning/50 bg-warning/20",
                )}
              >
                {filtered ? "滤镜开启 · 抽象模型" : "滤镜已摘 · 真实世界"}
              </Badge>
            </div>
            {subtitle ? (
              <CardDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {subtitle}
              </CardDescription>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2.5 rounded-lg border border-border/70 bg-background/85 px-3 py-2 sm:justify-start">
            <Label
              htmlFor={switchId}
              className={cn(
                "cursor-pointer text-xs transition-colors",
                !filtered
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
            >
              摘下滤镜
            </Label>
            <Switch
              id={switchId}
              checked={filtered}
              onCheckedChange={setFiltered}
              aria-label={filtered ? filterOnLabel : filterOffLabel}
            />
            <Label
              htmlFor={switchId}
              className={cn(
                "cursor-pointer text-xs transition-colors",
                filtered
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
            >
              开启滤镜
            </Label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {normalizedScenarios.length > 1 ? (
            <Tabs value={activeScenario.id} onValueChange={setActiveScenarioId}>
              <TabsList className="h-auto max-w-full flex-wrap justify-start gap-1 p-1">
                {normalizedScenarios.map((scenario) => (
                  <TabsTrigger
                    key={scenario.id}
                    value={scenario.id}
                    className="min-h-11 max-w-full whitespace-normal px-3 py-1.5 text-left text-xs sm:min-h-9 sm:text-center sm:text-sm"
                  >
                    {scenario.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              {filtered ? filterOnLabel : filterOffLabel}
            </span>
          )}

          <Button
            type="button"
            variant={filtered ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltered((prev) => !prev)}
            className="min-h-11 h-auto max-w-full gap-1.5 px-3 py-2 text-left text-xs whitespace-normal sm:min-h-8 sm:py-1.5"
          >
            {filtered ? (
              <>
                <Eye aria-hidden="true" className="size-3.5" />
                {filterOffLabel}
              </>
            ) : (
              <>
                <EyeOff aria-hidden="true" className="size-3.5" />
                {filterOnLabel}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="min-w-0 space-y-5 px-4 py-5 sm:px-6">
        {activeMetrics.length > 0 ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">
                模型保留的干净指标（{activeMetrics.length} 项）
              </span>
              <span className="font-mono">
                {filtered ? "当前高光焦点" : "仍存在，但不再是全部"}
              </span>
            </div>

            <div
              className={cn(
                "grid gap-3 transition-opacity",
                activeMetrics.length === 1
                  ? "grid-cols-1"
                  : activeMetrics.length === 2
                    ? "grid-cols-1 sm:grid-cols-2"
                    : activeMetrics.length === 4
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                      : "grid-cols-1 sm:grid-cols-3",
                !filtered && "opacity-75",
              )}
            >
              {activeMetrics.map((metric, idx) => (
                <div
                  key={`${metric.label}-${idx}`}
                  className={cn(
                    "rounded-lg border p-3.5 transition-colors",
                    filtered
                      ? "border-primary/35 bg-background shadow-xs"
                      : "border-border/70 bg-muted/35",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {metric.label}
                    </span>
                    {metric.badge ? (
                      <Badge
                        variant={filtered ? "secondary" : "outline"}
                        className="text-[11px]"
                      >
                        {metric.badge}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-1.5 font-mono text-lg font-semibold text-foreground sm:text-xl">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {activeOmitted.length > 0 ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">
                {filtered
                  ? `被抽象滤镜折叠的现实纹理（${activeOmitted.length} 条）`
                  : `重现的真实代价与现场细节（${activeOmitted.length} 条）`}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[11px] text-foreground",
                  filtered
                    ? "border-border bg-muted/50"
                    : "border-warning/50 bg-warning/20",
                )}
              >
                {filtered ? "模型不可见" : "已显影"}
              </Badge>
            </div>

            <div className="space-y-2.5">
              {activeOmitted.map((item, idx) => (
                <div
                  key={`${item.title}-${idx}`}
                  className={cn(
                    "rounded-lg border p-3.5 transition-all",
                    filtered
                      ? "border-dashed border-border/70 bg-muted/20 opacity-65"
                      : "border-warning/45 bg-warning/10 shadow-xs",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={filtered ? "outline" : "secondary"}
                        className="text-[11px]"
                      >
                        {item.tag}
                      </Badge>
                      <span
                        className={cn(
                          "text-sm font-medium text-foreground",
                          filtered &&
                            "line-through decoration-muted-foreground/70",
                        )}
                      >
                        {item.title}
                      </span>
                    </div>

                    {filtered ? (
                      <Badge
                        variant="outline"
                        className="text-[11px] text-muted-foreground"
                      >
                        已被模型省略
                      </Badge>
                    ) : item.cost ? (
                      <Badge
                        variant="outline"
                        className="border-destructive/45 bg-destructive/15 text-[11px] text-foreground"
                      >
                        代价：{item.cost}
                      </Badge>
                    ) : null}
                  </div>

                  {!filtered ? (
                    <p className="mt-2 text-xs leading-relaxed text-foreground/90 sm:text-sm">
                      {item.detail}
                    </p>
                  ) : (
                    <p className="mt-1.5 truncate text-xs text-muted-foreground">
                      细节已从汇总模型中剔除，点击「{filterOffLabel}」查看完整上下文。
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <Alert
          className={cn(
            "transition-colors",
            filtered
              ? "border-border/70 bg-muted/25"
              : "border-primary/35 bg-primary/5",
          )}
        >
          <Sparkles aria-hidden="true" className="size-4 text-primary" />
          <AlertTitle className="text-xs font-semibold text-foreground sm:text-sm">
            {filtered ? "模型视图小结" : "摘下滤镜后的另一半真相"}
          </AlertTitle>
          <AlertDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {filtered ? activeFilteredInsight : activeRevealedInsight}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
