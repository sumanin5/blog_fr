"use client";

import React, { useState } from "react";
import { Network, RotateCcw, ZapOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ResilienceDemoProps {
  title?: string;
  subtitle?: string;
  sourceLabel?: string;
  targetLabel?: string;
  singlePathTitle?: string;
  singlePathTradeoff?: string;
  multiPathTitle?: string;
  multiPathTradeoff?: string;
  defaultFailed?: boolean;
  footnote?: string;
}

type MultiBranchId = "upper" | "primary" | "lower";

const NODE_RADIUS = 13;

function handleNodeKeyDown(
  event: React.KeyboardEvent<SVGGElement>,
  onToggle: () => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onToggle();
  }
}

interface RelayNodeProps {
  x: number;
  y: number;
  label: string;
  failed: boolean;
  active: boolean;
  ariaLabel: string;
  onToggle: () => void;
  hitHeight?: number;
}

function InteractiveRelayNode({
  x,
  y,
  label,
  failed,
  active,
  ariaLabel,
  onToggle,
  hitHeight = 72,
}: RelayNodeProps) {
  const hitWidth = 72;
  const crossOffset = 4.5;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={failed}
      aria-label={ariaLabel}
      onClick={onToggle}
      onKeyDown={(event) => handleNodeKeyDown(event, onToggle)}
      className="group cursor-pointer outline-none"
    >
      <rect
        x={x - hitWidth / 2}
        y={y - hitHeight / 2}
        width={hitWidth}
        height={hitHeight}
        rx={12}
        className="fill-transparent stroke-transparent stroke-2 transition-colors duration-150 motion-reduce:transition-none group-focus-visible:stroke-ring"
      />

      <circle
        cx={x}
        cy={y}
        r={NODE_RADIUS + 4}
        className={cn(
          "fill-transparent stroke-transparent transition-colors duration-200 motion-reduce:transition-none",
          !failed && active && "stroke-primary/25",
          failed && "stroke-destructive/25",
        )}
        strokeWidth={2}
      />

      <circle
        cx={x}
        cy={y}
        r={NODE_RADIUS}
        strokeWidth={2.2}
        className={cn(
          "transition-colors duration-200 motion-reduce:transition-none",
          failed
            ? "fill-destructive/15 stroke-destructive"
            : active
              ? "fill-card stroke-primary group-hover:fill-primary/10"
              : "fill-card stroke-muted-foreground/60 group-hover:stroke-primary",
        )}
      />

      {failed ? (
        <g
          aria-hidden="true"
          className="stroke-destructive transition-colors duration-200 motion-reduce:transition-none"
          strokeWidth={2.4}
          strokeLinecap="round"
        >
          <line
            x1={x - crossOffset}
            y1={y - crossOffset}
            x2={x + crossOffset}
            y2={y + crossOffset}
          />
          <line
            x1={x + crossOffset}
            y1={y - crossOffset}
            x2={x - crossOffset}
            y2={y + crossOffset}
          />
        </g>
      ) : (
        <circle
          cx={x}
          cy={y}
          r={4}
          aria-hidden="true"
          className={cn(
            "transition-colors duration-200 motion-reduce:transition-none",
            active ? "fill-primary" : "fill-muted-foreground/60",
          )}
        />
      )}

      <text
        x={x}
        y={y + 30}
        textAnchor="middle"
        className={cn(
          "font-sans text-xs font-medium transition-colors duration-200 motion-reduce:transition-none",
          failed
            ? "fill-destructive"
            : active
              ? "fill-foreground"
              : "fill-muted-foreground",
        )}
      >
        {label}
      </text>
    </g>
  );
}

interface StaticNodeProps {
  x: number;
  y: number;
  label: string;
  active: boolean;
  emphasis?: "endpoint" | "junction";
}

function StaticTopologyNode({
  x,
  y,
  label,
  active,
  emphasis = "junction",
}: StaticNodeProps) {
  const isEndpoint = emphasis === "endpoint";

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={NODE_RADIUS}
        strokeWidth={isEndpoint ? 2.2 : 1.8}
        className={cn(
          "transition-colors duration-200 motion-reduce:transition-none",
          active
            ? isEndpoint
              ? "fill-primary/15 stroke-primary"
              : "fill-card stroke-primary"
            : "fill-muted/40 stroke-muted-foreground/45",
        )}
      />
      <circle
        cx={x}
        cy={y}
        r={isEndpoint ? 4 : 3}
        aria-hidden="true"
        className={cn(
          "transition-colors duration-200 motion-reduce:transition-none",
          active ? "fill-primary" : "fill-muted-foreground/50",
        )}
      />
      <text
        x={x}
        y={y + 30}
        textAnchor="middle"
        className={cn(
          "font-sans text-xs transition-colors duration-200 motion-reduce:transition-none",
          active
            ? "fill-foreground font-medium"
            : "fill-muted-foreground font-normal",
        )}
      >
        {label}
      </text>
    </g>
  );
}

/**
 * 网络节点失效与韧性绕行实验：
 * 对比单一路径系统与保留备用路径的系统在节点失效时的结构表现与常态成本取舍。
 */
export function ResilienceDemo({
  title = "当一个节点突然失效",
  subtitle = "概念性交互示意 · 点击图中中间节点或下方按钮，对比两种网络设计",
  sourceLabel = "发送端",
  targetLabel = "接收端",
  singlePathTitle = "高度依赖单一路径的系统",
  singlePathTradeoff = "链路最简、常态维护成本低；一旦唯一主中继失效，整条通信链路即告中断。",
  multiPathTitle = "保留备用路径的系统",
  multiPathTradeoff = "常态需要额外维持备用节点与分流/汇流能力，用更高的资源冗余换取局部故障下的绕行韧性。",
  defaultFailed = false,
  footnote = "概念性交互示意 · 对比单路径效率与多路径冗余之间的结构取舍，不代表特定网络协议实现。",
}: ResilienceDemoProps) {
  const [singlePrimaryFailed, setSinglePrimaryFailed] = useState<boolean>(
    Boolean(defaultFailed),
  );
  const [multiPrimaryFailed, setMultiPrimaryFailed] = useState<boolean>(
    Boolean(defaultFailed),
  );
  const [upperBackupFailed, setUpperBackupFailed] = useState<boolean>(false);
  const [lowerBackupFailed, setLowerBackupFailed] = useState<boolean>(false);

  const hasAnyFault =
    singlePrimaryFailed ||
    multiPrimaryFailed ||
    upperBackupFailed ||
    lowerBackupFailed;

  const multiFailedCount =
    Number(multiPrimaryFailed) +
    Number(upperBackupFailed) +
    Number(lowerBackupFailed);

  // 正常全通时默认走主路径；一旦任一中继失效，优先按 上备用 -> 主中继 -> 下备用 顺序自动绕行
  const multiActiveRoute: MultiBranchId | null =
    multiFailedCount === 0
      ? "primary"
      : !upperBackupFailed
        ? "upper"
        : !multiPrimaryFailed
          ? "primary"
          : !lowerBackupFailed
            ? "lower"
            : null;

  const multiConnected = multiActiveRoute !== null;

  const handleGlobalAction = () => {
    if (hasAnyFault) {
      setSinglePrimaryFailed(false);
      setMultiPrimaryFailed(false);
      setUpperBackupFailed(false);
      setLowerBackupFailed(false);
      return;
    }
    setSinglePrimaryFailed(true);
    setMultiPrimaryFailed(true);
  };

  const headerBadge = !hasAnyFault
    ? {
        label: "正常连通",
        className: "border-success/45 bg-success/15 text-foreground",
      }
    : multiConnected
      ? {
          label: "故障对照中",
          className: "border-warning/50 bg-warning/20 text-foreground",
        }
      : {
          label: "冗余耗尽",
          className: "border-destructive/45 bg-destructive/15 text-destructive",
        };

  const singleStatusText = singlePrimaryFailed
    ? "关键节点失效，通信中断"
    : "正常通信";

  const multiStatusText =
    multiFailedCount === 0
      ? "正常通信（备用路径待命）"
      : multiConnected
        ? "绕过故障节点，恢复通信"
        : "备用路径耗尽，通信中断";

  const branchStrokeClass = (branch: MultiBranchId, failed: boolean) => {
    if (failed) return "stroke-destructive/80";
    if (multiActiveRoute === branch) return "stroke-primary";
    return "stroke-muted-foreground/35";
  };

  return (
    <Card className="not-prose my-6 gap-0 space-y-4 rounded-lg border border-border/80 bg-card p-4 shadow-sm sm:p-5">
      <div className="min-w-0 space-y-1.5 border-b border-border/60 pb-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Network
              aria-hidden="true"
              className="size-4 shrink-0 text-primary"
            />
            <h3 className="m-0 text-base font-semibold text-foreground sm:text-lg">
              {title}
            </h3>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 font-mono text-xs", headerBadge.className)}
          >
            {headerBadge.label}
          </Badge>
        </div>
        <p className="m-0 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {subtitle}
        </p>
      </div>

      <div
        data-testid="single-path-panel"
        data-state={singlePrimaryFailed ? "failed" : "healthy"}
        className="min-w-0 space-y-2.5 rounded-md border border-border/70 bg-background/70 p-3 sm:p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground sm:text-sm">
            {singlePathTitle}
          </span>
          <span
            aria-live="polite"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium",
              singlePrimaryFailed ? "text-destructive" : "text-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2 shrink-0 rounded-full",
                singlePrimaryFailed ? "bg-destructive" : "bg-success",
              )}
            />
            {singleStatusText}
          </span>
        </div>

        <div className="mx-auto w-full max-w-xl">
          <svg
            viewBox="0 0 440 104"
            role="group"
            aria-label={`${singlePathTitle}拓扑图`}
            className="block h-auto w-full select-none"
          >
            {/* 发送端 -> 中继前 */}
            <line
              x1={57}
              y1={44}
              x2={119}
              y2={44}
              strokeWidth={2.6}
              strokeLinecap="round"
              className="stroke-primary transition-colors duration-200 motion-reduce:transition-none"
            />

            {/* 中继前 -> 主中继 */}
            <line
              x1={145}
              y1={44}
              x2={207}
              y2={44}
              strokeWidth={singlePrimaryFailed ? 2 : 2.6}
              strokeDasharray={singlePrimaryFailed ? "5 4" : undefined}
              strokeLinecap="round"
              className={cn(
                "transition-colors duration-200 motion-reduce:transition-none",
                singlePrimaryFailed ? "stroke-destructive" : "stroke-primary",
              )}
            />

            {/* 主中继 -> 中继后 */}
            <line
              x1={233}
              y1={44}
              x2={295}
              y2={44}
              strokeWidth={singlePrimaryFailed ? 2 : 2.6}
              strokeDasharray={singlePrimaryFailed ? "5 4" : undefined}
              strokeLinecap="round"
              className={cn(
                "transition-colors duration-200 motion-reduce:transition-none",
                singlePrimaryFailed
                  ? "stroke-destructive/70"
                  : "stroke-primary",
              )}
            />

            {/* 中继后 -> 接收端 */}
            <line
              x1={321}
              y1={44}
              x2={383}
              y2={44}
              strokeWidth={singlePrimaryFailed ? 1.8 : 2.6}
              strokeLinecap="round"
              className={cn(
                "transition-colors duration-200 motion-reduce:transition-none",
                singlePrimaryFailed
                  ? "stroke-muted-foreground/40"
                  : "stroke-primary",
              )}
            />

            <StaticTopologyNode
              x={44}
              y={44}
              label={sourceLabel}
              active
              emphasis="endpoint"
            />
            <StaticTopologyNode x={132} y={44} label="中继前" active />
            <InteractiveRelayNode
              x={220}
              y={44}
              label="主中继"
              failed={singlePrimaryFailed}
              active={!singlePrimaryFailed}
              ariaLabel={`单路径主中继，当前${singlePrimaryFailed ? "已失效，点击恢复" : "正常，点击模拟失效"}`}
              onToggle={() => setSinglePrimaryFailed((prev) => !prev)}
            />
            <StaticTopologyNode
              x={308}
              y={44}
              label="中继后"
              active={!singlePrimaryFailed}
            />
            <StaticTopologyNode
              x={396}
              y={44}
              label={targetLabel}
              active={!singlePrimaryFailed}
              emphasis="endpoint"
            />
          </svg>
        </div>

        <p className="m-0 border-t border-border/50 pt-2 text-xs leading-relaxed text-muted-foreground">
          {singlePathTradeoff}
        </p>
      </div>

      <div
        data-testid="multi-path-panel"
        data-active-route={multiActiveRoute ?? "none"}
        className="min-w-0 space-y-2.5 rounded-md border border-border/70 bg-background/70 p-3 sm:p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground sm:text-sm">
            {multiPathTitle}
          </span>
          <span
            aria-live="polite"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium",
              !multiConnected ? "text-destructive" : "text-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2 shrink-0 rounded-full",
                multiFailedCount === 0
                  ? "bg-success"
                  : multiConnected
                    ? "bg-primary"
                    : "bg-destructive",
              )}
            />
            {multiStatusText}
          </span>
        </div>

        <div className="mx-auto w-full max-w-xl">
          <svg
            viewBox="0 0 440 226"
            role="group"
            aria-label={`${multiPathTitle}拓扑图`}
            className="block h-auto w-full select-none"
          >
            {/* 发送端 -> 分流节点 */}
            <line
              x1={57}
              y1={110}
              x2={119}
              y2={110}
              strokeWidth={2.6}
              strokeLinecap="round"
              className="stroke-primary transition-colors duration-200 motion-reduce:transition-none"
            />

            {/* 上备用分支连线 */}
            <path
              d="M 145 110 C 174 110, 178 38, 207 38"
              fill="none"
              strokeWidth={
                upperBackupFailed ? 2 : multiActiveRoute === "upper" ? 2.6 : 1.6
              }
              strokeDasharray={upperBackupFailed ? "5 4" : undefined}
              strokeLinecap="round"
              className={cn(
                "transition-colors duration-200 motion-reduce:transition-none",
                branchStrokeClass("upper", upperBackupFailed),
              )}
            />
            <path
              d="M 233 38 C 262 38, 266 110, 295 110"
              fill="none"
              strokeWidth={
                upperBackupFailed ? 2 : multiActiveRoute === "upper" ? 2.6 : 1.6
              }
              strokeDasharray={upperBackupFailed ? "5 4" : undefined}
              strokeLinecap="round"
              className={cn(
                "transition-colors duration-200 motion-reduce:transition-none",
                branchStrokeClass("upper", upperBackupFailed),
              )}
            />

            {/* 主中继分支连线 */}
            <path
              d="M 145 110 L 207 110"
              fill="none"
              strokeWidth={
                multiPrimaryFailed
                  ? 2
                  : multiActiveRoute === "primary"
                    ? 2.6
                    : 1.6
              }
              strokeDasharray={multiPrimaryFailed ? "5 4" : undefined}
              strokeLinecap="round"
              className={cn(
                "transition-colors duration-200 motion-reduce:transition-none",
                branchStrokeClass("primary", multiPrimaryFailed),
              )}
            />
            <path
              d="M 233 110 L 295 110"
              fill="none"
              strokeWidth={
                multiPrimaryFailed
                  ? 2
                  : multiActiveRoute === "primary"
                    ? 2.6
                    : 1.6
              }
              strokeDasharray={multiPrimaryFailed ? "5 4" : undefined}
              strokeLinecap="round"
              className={cn(
                "transition-colors duration-200 motion-reduce:transition-none",
                branchStrokeClass("primary", multiPrimaryFailed),
              )}
            />

            {/* 下备用分支连线 */}
            <path
              d="M 145 110 C 174 110, 178 182, 207 182"
              fill="none"
              strokeWidth={
                lowerBackupFailed ? 2 : multiActiveRoute === "lower" ? 2.6 : 1.6
              }
              strokeDasharray={lowerBackupFailed ? "5 4" : undefined}
              strokeLinecap="round"
              className={cn(
                "transition-colors duration-200 motion-reduce:transition-none",
                branchStrokeClass("lower", lowerBackupFailed),
              )}
            />
            <path
              d="M 233 182 C 262 182, 266 110, 295 110"
              fill="none"
              strokeWidth={
                lowerBackupFailed ? 2 : multiActiveRoute === "lower" ? 2.6 : 1.6
              }
              strokeDasharray={lowerBackupFailed ? "5 4" : undefined}
              strokeLinecap="round"
              className={cn(
                "transition-colors duration-200 motion-reduce:transition-none",
                branchStrokeClass("lower", lowerBackupFailed),
              )}
            />

            {/* 汇流节点 -> 接收端 */}
            <line
              x1={321}
              y1={110}
              x2={383}
              y2={110}
              strokeWidth={multiConnected ? 2.6 : 1.8}
              strokeLinecap="round"
              className={cn(
                "transition-colors duration-200 motion-reduce:transition-none",
                multiConnected ? "stroke-primary" : "stroke-muted-foreground/40",
              )}
            />

            <StaticTopologyNode
              x={44}
              y={110}
              label={sourceLabel}
              active
              emphasis="endpoint"
            />
            <StaticTopologyNode x={132} y={110} label="分流节点" active />

            <InteractiveRelayNode
              x={220}
              y={38}
              label="上备用"
              failed={upperBackupFailed}
              active={multiActiveRoute === "upper"}
              hitHeight={70}
              ariaLabel={`多路径上备用节点，当前${upperBackupFailed ? "已失效，点击恢复" : "可用，点击模拟失效"}`}
              onToggle={() => setUpperBackupFailed((prev) => !prev)}
            />
            <InteractiveRelayNode
              x={220}
              y={110}
              label="主中继"
              failed={multiPrimaryFailed}
              active={multiActiveRoute === "primary"}
              hitHeight={70}
              ariaLabel={`多路径主中继节点，当前${multiPrimaryFailed ? "已失效，点击恢复" : "可用，点击模拟失效"}`}
              onToggle={() => setMultiPrimaryFailed((prev) => !prev)}
            />
            <InteractiveRelayNode
              x={220}
              y={182}
              label="下备用"
              failed={lowerBackupFailed}
              active={multiActiveRoute === "lower"}
              hitHeight={70}
              ariaLabel={`多路径下备用节点，当前${lowerBackupFailed ? "已失效，点击恢复" : "可用，点击模拟失效"}`}
              onToggle={() => setLowerBackupFailed((prev) => !prev)}
            />

            <StaticTopologyNode
              x={308}
              y={110}
              label="汇流节点"
              active={multiConnected}
            />
            <StaticTopologyNode
              x={396}
              y={110}
              label={targetLabel}
              active={multiConnected}
              emphasis="endpoint"
            />
          </svg>
        </div>

        <p className="m-0 border-t border-border/50 pt-2 text-xs leading-relaxed text-muted-foreground">
          {multiPathTradeoff}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGlobalAction}
        className="min-h-11 w-full gap-2 text-sm font-medium"
      >
        {hasAnyFault ? (
          <>
            <RotateCcw aria-hidden="true" className="size-4" />
            恢复全部节点
          </>
        ) : (
          <>
            <ZapOff aria-hidden="true" className="size-4" />
            模拟主节点失效
          </>
        )}
      </Button>

      <p className="m-0 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
        {footnote}
      </p>
    </Card>
  );
}
