"use client";

import * as React from "react";
import { Activity, Pause, Play, Radio, SkipForward } from "lucide-react";

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
import { cn } from "@/lib/utils";

export interface TimeScaleTask {
  /** 任务轨道名称 */
  label: string;
}

export interface TimeScaleDemoProps {
  /** 模拟模式："cpu-multitask" 单核时间片并发真相；"signal-threshold" 模拟电压与噪声容差判决 */
  mode?: "cpu-multitask" | "signal-threshold";
  /** 可选自定义主标题 */
  title?: string;
  /** 可选自定义副标题 */
  subtitle?: string;
  /** cpu-multitask 模式的并发任务列表 */
  tasks?: TimeScaleTask[];
  /** cpu-multitask 初始时间倍速位置（0..100，100 对应 1.00x 宏观实时，0 对应 0.01x 微观慢放） */
  defaultSpeedScale?: number;
  /** signal-threshold 初始噪声强度（0..100） */
  defaultNoise?: number;
}

const DEFAULT_TASKS: TimeScaleTask[] = [
  { label: "UI 渲染" },
  { label: "网络请求" },
  { label: "日志落盘" },
];

const SLICE_COUNT = 12;
const BIT_PATTERNS: Array<{ id: string; label: string; bits: Array<0 | 1> }> = [
  { id: "sample-a", label: "样本脉冲 10110100", bits: [1, 0, 1, 1, 0, 1, 0, 0] },
  { id: "sample-b", label: "ASCII 'K' 01001011", bits: [0, 1, 0, 0, 1, 0, 1, 1] },
];

const TRACK_COLORS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
] as const;

export function sliderToSpeedFactor(sliderValue: number): number {
  const clamped = Math.min(100, Math.max(0, sliderValue));
  return Number((0.01 * Math.pow(100, clamped / 100)).toFixed(2));
}

function deterministicRipple(sampleIndex: number, patternIndex: number): number {
  const angle = (sampleIndex + 1) * 1.15 + patternIndex * 1.7;
  const raw =
    Math.sin(angle * 0.85) * 0.55 +
    Math.cos(angle * 2.1) * 0.28 +
    Math.sin(angle * 4.9) * 0.17;
  return Math.max(-1, Math.min(1, raw));
}

const BIT_INTERFERENCE_GAIN = [0.78, -0.45, 0.92, 0.3, -0.88, 0.65, -0.82, 0.5];

export function evaluateSignalSample(
  bits: Array<0 | 1>,
  noisePercent: number,
  patternSeed = 0,
) {
  const amplitude = (Math.min(100, Math.max(0, noisePercent)) / 100) * 0.72;
  const samplesPerBit = 10;
  const totalSamples = bits.length * samplesPerBit;

  const waveform: Array<{ xNorm: number; voltage: number; target: 0 | 1 }> = [];
  for (let i = 0; i < totalSamples; i += 1) {
    const bitIdx = Math.floor(i / samplesPerBit);
    const target = bits[bitIdx] ?? 0;
    const baseVoltage = target === 1 ? 0.84 : 0.16;
    const gain =
      BIT_INTERFERENCE_GAIN[(bitIdx + patternSeed) % BIT_INTERFERENCE_GAIN.length] ??
      0.6;
    // 叠加低频共模漂移与高频瞬态毛刺：部分码元在强干扰下会被拉向相反逻辑电平
    const drift = target === 1 ? -Math.abs(gain) : Math.abs(gain);
    const ripple = deterministicRipple(i, patternSeed) * 0.35;
    const noisyVoltage = baseVoltage + amplitude * (0.75 * drift + ripple);
    waveform.push({
      xNorm: i / Math.max(1, totalSamples - 1),
      voltage: Math.max(0.03, Math.min(0.97, noisyVoltage)),
      target,
    });
  }

  const decodedBits = bits.map((expected, bitIdx) => {
    const sampleCenter = bitIdx * samplesPerBit + Math.floor(samplesPerBit / 2);
    const start = bitIdx * samplesPerBit + 2;
    const end = bitIdx * samplesPerBit + samplesPerBit - 2;
    let enteredUncertainZone = false;

    for (let i = start; i < end; i += 1) {
      const v = waveform[i]?.voltage ?? 0.5;
      if (v > 0.38 && v < 0.62) {
        enteredUncertainZone = true;
      }
    }

    // 模拟数字触发器在时钟采样沿瞬时锁定电压并与 0.5V 中值比较
    const sampledVoltage = waveform[sampleCenter]?.voltage ?? 0.5;
    const decoded: 0 | 1 = sampledVoltage >= 0.5 ? 1 : 0;
    return {
      index: bitIdx,
      expected,
      decoded,
      avgVoltage: sampledVoltage,
      isError: decoded !== expected,
      enteredUncertainZone,
    };
  });

  const errorCount = decodedBits.filter((item) => item.isError).length;
  const uncertainCount = decodedBits.filter(
    (item) => item.enteredUncertainZone,
  ).length;

  return { waveform, decodedBits, errorCount, uncertainCount };
}

function CpuMultitaskView({
  tasks = DEFAULT_TASKS,
  defaultSpeedScale = 100,
}: {
  tasks?: TimeScaleTask[];
  defaultSpeedScale?: number;
}) {
  const safeTasks = tasks.length > 0 ? tasks : DEFAULT_TASKS;
  const [speedScale, setSpeedScale] = React.useState(() =>
    Math.min(100, Math.max(0, defaultSpeedScale)),
  );
  const [sliceIndex, setSliceIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(mql.matches);
      if (mql.matches) {
        setIsPlaying(false);
      }
    };
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const speedFactor = sliderToSpeedFactor(speedScale);
  const isMacroIllusion = speedFactor >= 0.45;

  React.useEffect(() => {
    if (!isPlaying || reducedMotion) return;
    // 1.00x -> ~45ms 快速轮转制造宏观同时运行视觉；0.01x -> ~900ms 清晰呈现单核逐片切换
    const intervalMs = Math.round(
      Math.max(45, Math.min(1000, 45 / Math.max(0.04, speedFactor))),
    );
    const timer = window.setInterval(() => {
      setSliceIndex((prev) => (prev + 1) % SLICE_COUNT);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, reducedMotion, speedFactor]);

  const activeTaskIndex = sliceIndex % safeTasks.length;

  return (
    <div className="space-y-5">
      <div className="space-y-2.5 rounded-lg border border-border/70 bg-muted/30 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-muted-foreground sm:text-sm">
              时间观测倍速：
            </Label>
            <Badge variant="outline" className="font-mono text-xs text-foreground">
              {speedFactor.toFixed(2)}x
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-xs text-foreground",
                isMacroIllusion
                  ? "border-info/45 bg-info/15"
                  : "border-warning/50 bg-warning/20",
              )}
            >
              {isMacroIllusion ? "宏观并发错觉" : "微观单核切片真相"}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPlaying((prev) => !prev)}
              className="h-7 gap-1 px-2.5 text-xs"
            >
              {isPlaying ? (
                <>
                  <Pause aria-hidden="true" className="size-3.5" />
                  暂停
                </>
              ) : (
                <>
                  <Play aria-hidden="true" className="size-3.5" />
                  播放
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPlaying(false);
                setSliceIndex((prev) => (prev + 1) % SLICE_COUNT);
              }}
              className="h-7 gap-1 px-2.5 text-xs"
            >
              <SkipForward aria-hidden="true" className="size-3.5" />
              下一微片
            </Button>
          </div>
        </div>

        <RangeSlider
          min={0}
          max={100}
          step={5}
          value={speedScale}
          onValueChange={setSpeedScale}
          showTicks={false}
          aria-label="调整时间观测倍速（0.01x 到 1.00x）"
          formatValueText={(v) => `${sliderToSpeedFactor(v).toFixed(2)}x`}
        />

        <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>0.01x（显微镜慢放）</span>
          <span>0.10x</span>
          <span>1.00x（人类肉眼实时）</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {safeTasks.map((task, taskIdx) => {
          const isExecutingNow = taskIdx === activeTaskIndex;
          const colorClass = TRACK_COLORS[taskIdx % TRACK_COLORS.length];

          return (
            <div
              key={`${task.label}-${taskIdx}`}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                isMacroIllusion
                  ? "border-border/80 bg-background/80"
                  : isExecutingNow
                    ? "border-primary/60 bg-primary/5"
                    : "border-border/60 bg-muted/20 opacity-75",
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-block size-2.5 rounded-full",
                      isMacroIllusion || isExecutingNow
                        ? colorClass
                        : "bg-muted-foreground/40",
                    )}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {task.label}
                  </span>
                </div>
                <Badge
                  variant={
                    isMacroIllusion || isExecutingNow ? "secondary" : "outline"
                  }
                  className="font-mono text-[11px]"
                >
                  {isMacroIllusion
                    ? "表象：持续运行中"
                    : isExecutingNow
                      ? "CPU 占用中 (Slice)"
                      : "就绪排队 / 挂起"}
                </Badge>
              </div>

              <div className="grid grid-cols-12 gap-1">
                {Array.from({ length: SLICE_COUNT }, (_, slotIdx) => {
                  const belongsToThisTrack = slotIdx % safeTasks.length === taskIdx;
                  const isCurrentCursor = slotIdx === sliceIndex;

                  const filled = isMacroIllusion
                    ? true
                    : belongsToThisTrack;

                  return (
                    <div
                      key={`${taskIdx}-slot-${slotIdx}`}
                      className={cn(
                        "h-3 rounded-xs border transition-opacity",
                        filled
                          ? `${colorClass} border-transparent`
                          : "border-border/50 bg-muted/40",
                        !isMacroIllusion &&
                          isCurrentCursor &&
                          isExecutingNow &&
                          "ring-2 ring-foreground/70 ring-offset-1 ring-offset-background",
                        isMacroIllusion && "opacity-85",
                        !isMacroIllusion &&
                          belongsToThisTrack &&
                          !isCurrentCursor &&
                          "opacity-45",
                      )}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Alert className="border-border/70 bg-muted/25">
        <Activity aria-hidden="true" className="size-4 text-primary" />
        <AlertTitle className="text-xs font-semibold text-foreground sm:text-sm">
          {isMacroIllusion
            ? "1x 宏观视图：并行的错觉"
            : `${speedFactor.toFixed(2)}x 微观视图：单核分时切片`}
        </AlertTitle>
        <AlertDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {isMacroIllusion
            ? "当时间片切换间隔缩短到十毫秒级时，人类无法分辨短暂的暂停，所有轨道看起来仿佛同时都在推进。将上方滑块向左拖至 0.40x 以下即可看清真相。"
            : `在任意一个微时间片内（当前切片 #${sliceIndex + 1}），单核 CPU 只能执行「${safeTasks[activeTaskIndex]?.label}」，其余轨道只能安静等待调度器轮转。`}
        </AlertDescription>
      </Alert>
    </div>
  );
}

function SignalThresholdView({ defaultNoise = 18 }: { defaultNoise?: number }) {
  const [noise, setNoise] = React.useState(() =>
    Math.min(100, Math.max(0, defaultNoise)),
  );
  const [patternIdx, setPatternIdx] = React.useState(0);

  const activePattern = BIT_PATTERNS[patternIdx] ?? BIT_PATTERNS[0];
  const sim = React.useMemo(
    () => evaluateSignalSample(activePattern.bits, noise, patternIdx),
    [activePattern.bits, noise, patternIdx],
  );

  const width = 640;
  const height = 190;
  const padX = 16;
  const padY = 16;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const yForVoltage = (v: number) => padY + (1 - v) * plotH;
  const xForNorm = (xn: number) => padX + xn * plotW;

  const analogPath = sim.waveform
    .map(
      (pt, i) =>
        `${i === 0 ? "M" : "L"} ${xForNorm(pt.xNorm).toFixed(1)} ${yForVoltage(
          pt.voltage,
        ).toFixed(1)}`,
    )
    .join(" ");

  const vihY = yForVoltage(0.62);
  const vilY = yForVoltage(0.38);
  const thresholdBandHeight = Math.max(0, vilY - vihY);

  const hasErrors = sim.errorCount > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {BIT_PATTERNS.map((pat, idx) => (
            <Button
              key={pat.id}
              type="button"
              size="sm"
              variant={idx === patternIdx ? "default" : "outline"}
              onClick={() => setPatternIdx(idx)}
              className="h-7 px-2.5 font-mono text-xs"
            >
              {pat.label}
            </Button>
          ))}
        </div>

        <Badge
          variant="outline"
          className={cn(
            "font-mono text-xs text-foreground",
            hasErrors
              ? "border-destructive/45 bg-destructive/15"
              : sim.uncertainCount > 0
                ? "border-warning/50 bg-warning/20"
                : "border-success/45 bg-success/15",
          )}
        >
          {hasErrors
            ? `误码 ${sim.errorCount}/${activePattern.bits.length} · 边界击穿`
            : sim.uncertainCount > 0
              ? "逼近判决容差边界"
              : `误码 0/${activePattern.bits.length} · 干净方波`}
        </Badge>
      </div>

      <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3.5 sm:p-4">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="font-medium text-muted-foreground">
            信道噪声干扰强度
          </span>
          <span className="font-mono font-semibold text-foreground">
            {noise}%
          </span>
        </div>
        <RangeSlider
          min={0}
          max={100}
          step={5}
          value={noise}
          onValueChange={setNoise}
          showTicks={false}
          aria-label="调整模拟信道噪声强度百分比"
          formatValueText={(v) => `噪声 ${v}%`}
        />
        <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>0%（理想无噪）</span>
          <span>45%（容差警戒线）</span>
          <span>100%（强干扰穿帮）</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/70 bg-background/80 p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="带噪模拟电压曲线与数字方波判决阈值对比图"
          className="h-44 w-full select-none sm:h-48"
        >
          <rect
            x={padX}
            y={vihY}
            width={plotW}
            height={thresholdBandHeight}
            className="fill-warning/15"
          />

          <line
            x1={padX}
            y1={vihY}
            x2={padX + plotW}
            y2={vihY}
            strokeDasharray="4 4"
            strokeWidth={1.2}
            className="stroke-border"
          />
          <line
            x1={padX}
            y1={vilY}
            x2={padX + plotW}
            y2={vilY}
            strokeDasharray="4 4"
            strokeWidth={1.2}
            className="stroke-border"
          />

          <text
            x={padX + 4}
            y={vihY - 5}
            className="fill-muted-foreground font-mono text-[10px]"
          >
            逻辑 1 容差下限 (0.62V)
          </text>
          <text
            x={padX + 4}
            y={vilY + 12}
            className="fill-muted-foreground font-mono text-[10px]"
          >
            逻辑 0 容差上限 (0.38V)
          </text>

          {sim.decodedBits.map((bit) => {
            const slotW = plotW / sim.decodedBits.length;
            const slotX = padX + bit.index * slotW;
            if (!bit.isError) return null;
            return (
              <rect
                key={`err-slot-${bit.index}`}
                x={slotX}
                y={padY}
                width={slotW}
                height={plotH}
                className="fill-destructive/10"
              />
            );
          })}

          <path
            d={analogPath}
            fill="none"
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
            className={hasErrors ? "stroke-destructive" : "stroke-primary"}
          />
        </svg>

        <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          {sim.decodedBits.map((bit) => (
            <div
              key={`bit-${bit.index}`}
              className={cn(
                "rounded-md border px-2 py-1.5 text-center font-mono text-xs transition-colors",
                bit.isError
                  ? "border-destructive/50 bg-destructive/15 text-foreground"
                  : "border-border/70 bg-muted/35 text-foreground",
              )}
            >
              <div className="text-[10px] text-muted-foreground">
                发送 {bit.expected}
              </div>
              <div className="mt-0.5 font-semibold">
                读出 {bit.decoded} {bit.isError ? "✕" : "✓"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Alert className="border-border/70 bg-muted/25">
        <Radio aria-hidden="true" className="size-4 text-primary" />
        <AlertTitle className="text-xs font-semibold text-foreground sm:text-sm">
          {hasErrors
            ? "噪声越过门槛，数字 0/1 抽象崩塌"
            : "门槛吸收了连续世界的抖动"}
        </AlertTitle>
        <AlertDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {hasErrors
            ? "硬件底层从来没有完美方波，只有连续电压。当干扰突破中间安全容差带并跨越 0.5V 中值时，判决器会把 1 误读成 0，数字层立刻出现不可预测的乱码。"
            : "只要物理信道上的电压波动被压在安全阈值内（高于 0.62V 算 1、低于 0.38V 算 0），上层软件就能安心把电路当成干干净净的布尔代数。"}
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * 宏观/微观视角模拟器：用单一交互滑块拆穿“丝滑并发”与“干净数字信号”背后的底层现实。
 */
export function TimeScaleDemo({
  mode = "cpu-multitask",
  title,
  subtitle,
  tasks = DEFAULT_TASKS,
  defaultSpeedScale = 100,
  defaultNoise = 18,
}: TimeScaleDemoProps) {
  const isSignal = mode === "signal-threshold";
  const resolvedTitle =
    title ?? (isSignal ? "噪声阈值与数字方波模拟器" : "单核时间片并发错觉模拟器");
  const resolvedSubtitle =
    subtitle ??
    (isSignal
      ? "拖动噪声强度滑块，观察连续世界的物理电压如何在阈值内给出干净 0/1，又如何在越界后瞬间乱码。"
      : "把时间慢放 100 倍：在人类感觉里并驾齐驱的多任务，在微观时间尺度上只是单核轮流切片。");

  return (
    <Card className="not-prose my-8 gap-0 overflow-hidden border-border/70 bg-card/70 py-0 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/30 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {isSignal ? (
            <Radio aria-hidden="true" className="size-4 text-primary" />
          ) : (
            <Activity aria-hidden="true" className="size-4 text-primary" />
          )}
          <CardTitle className="text-base font-semibold text-foreground sm:text-lg">
            {resolvedTitle}
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-xs">
            {mode}
          </Badge>
        </div>
        <CardDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {resolvedSubtitle}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-4 py-5 sm:px-6">
        {isSignal ? (
          <SignalThresholdView defaultNoise={defaultNoise} />
        ) : (
          <CpuMultitaskView
            tasks={tasks}
            defaultSpeedScale={defaultSpeedScale}
          />
        )}
      </CardContent>
    </Card>
  );
}
