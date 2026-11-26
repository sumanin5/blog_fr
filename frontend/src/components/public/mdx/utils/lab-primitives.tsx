"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export type LabMeterTone = "primary" | "neutral" | "destructive";

export interface LabMeterProps {
  label: string;
  value: number;
  unit?: string;
  hint?: string;
  tone?: LabMeterTone;
  tag?: string;
  className?: string;
}

/**
 * 实验仪器风格的极细概念示意标尺（h-1.5 + tabular-nums 数值读数）。
 */
export function LabMeter({
  label,
  value,
  unit = "%",
  hint,
  tone = "primary",
  tag,
  className,
}: LabMeterProps) {
  const safeValue = clampPercentage(value);

  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex min-w-0 items-center gap-1.5">
          {tone === "destructive" ? (
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-destructive"
            />
          ) : null}
          <span className="truncate font-medium text-muted-foreground">
            {label}
          </span>
          {tag ? (
            <Badge
              variant="outline"
              className="shrink-0 px-1.5 py-0 text-xs font-normal text-muted-foreground"
            >
              {tag}
            </Badge>
          ) : null}
        </div>
        <span
          className={cn(
            "shrink-0 font-mono text-xs font-semibold tabular-nums",
            tone === "destructive" ? "text-destructive" : "text-foreground",
          )}
        >
          {safeValue}
          {unit}
        </span>
      </div>

      <Progress
        value={safeValue}
        aria-label={`${label} ${safeValue}${unit}`}
        className={cn(
          "h-1.5 bg-muted",
          tone === "destructive" &&
            "[&>[data-slot=progress-indicator]]:bg-destructive",
          tone === "neutral" &&
            "[&>[data-slot=progress-indicator]]:bg-muted-foreground",
        )}
      />

      {hint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
