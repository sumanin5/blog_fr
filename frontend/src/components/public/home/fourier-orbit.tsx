"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";

const SAMPLE_COUNT = 256;
const MAX_HARMONICS = 60;
const DEFAULT_HARMONICS = 40;
const TAU = Math.PI * 2;
// 每画完一个图形停留的时间（毫秒），然后切换到下一个
const HOLD_MS = 1400;
const DRAW_SPEED = 0.9; // rad/s

interface ComplexCoefficient {
  frequency: number;
  amplitude: number;
  phase: number;
}

interface Point {
  x: number;
  y: number;
}

interface FourierModel {
  coefficients: ComplexCoefficient[];
  targetPath: Point[];
}

/**
 * 三个目标图形，对应站点的三层含义：书写 · 生长 · 推导。
 * 以 100×100 坐标系描述的单条闭合 SVG 路径，运行时用 getPointAtLength 等弧长采样。
 */
const SHAPES = [
  {
    key: "nib",
    label: "笔尖 · 书写",
    d: "M50 4 L76 44 Q70 70 60 92 L54 92 L54 58 A5 5 0 1 0 46 58 L46 92 L40 92 Q30 70 24 44 Z",
  },
  {
    key: "leaf",
    label: "叶子 · 生长",
    d: "M50 6 C80 20 94 52 72 80 C64 89 56 93 51 94 L51 99 L49 99 L49 94 C44 93 36 89 28 80 C6 52 20 20 50 6 Z",
  },
  {
    key: "sigma",
    label: "Σ · 推导",
    d: "M20 10 L80 10 L80 26 L42 26 L62 50 L42 74 L80 74 L80 90 L20 90 L20 78 L42 50 L20 22 Z",
  },
] as const;

/** 沿 SVG 路径等弧长采样，归一化到 [-1, 1]，y 轴朝上 */
function samplePath(d: string): Point[] {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", d);
  svg.appendChild(path);
  document.body.appendChild(svg);

  const length = path.getTotalLength();
  const points = Array.from({ length: SAMPLE_COUNT }, (_, index) => {
    const point = path.getPointAtLength((index / SAMPLE_COUNT) * length);
    return { x: (point.x - 50) / 50, y: -(point.y - 50) / 50 };
  });
  svg.remove();
  return points;
}

/**
 * 对闭合路径做离散傅里叶变换，得到一组旋转向量（本轮 / epicycles）。
 * 按振幅排序后取前 N 项，N 越大越接近原图形。
 */
function buildFourierModel(targetPath: Point[]): FourierModel {
  const coefficients: ComplexCoefficient[] = [];

  for (let frequencyIndex = 0; frequencyIndex < SAMPLE_COUNT; frequencyIndex++) {
    let real = 0;
    let imaginary = 0;

    for (let sampleIndex = 0; sampleIndex < SAMPLE_COUNT; sampleIndex++) {
      const angle = (TAU * frequencyIndex * sampleIndex) / SAMPLE_COUNT;
      const { x, y } = targetPath[sampleIndex];

      // z * e^(-iθ) = (x + iy)(cosθ - i sinθ)
      real += x * Math.cos(angle) + y * Math.sin(angle);
      imaginary += y * Math.cos(angle) - x * Math.sin(angle);
    }

    real /= SAMPLE_COUNT;
    imaginary /= SAMPLE_COUNT;

    const frequency =
      frequencyIndex > SAMPLE_COUNT / 2
        ? frequencyIndex - SAMPLE_COUNT
        : frequencyIndex;

    coefficients.push({
      frequency,
      amplitude: Math.hypot(real, imaginary),
      phase: Math.atan2(imaginary, real),
    });
  }

  return {
    coefficients: coefficients
      .sort((a, b) => b.amplitude - a.amplitude)
      .slice(0, MAX_HARMONICS),
    targetPath,
  };
}

let modelCache: FourierModel[] | null = null;
function getModels() {
  modelCache ??= SHAPES.map((shape) => buildFourierModel(samplePath(shape.d)));
  return modelCache;
}

/** 前 N 项本轮在 t 时刻的端点 */
function evaluate(coefficients: ComplexCoefficient[], harmonics: number, t: number): Point {
  let x = 0;
  let y = 0;
  for (let index = 0; index < harmonics; index++) {
    const { frequency, amplitude, phase } = coefficients[index];
    const angle = frequency * t + phase;
    x += amplitude * Math.cos(angle);
    y += amplitude * Math.sin(angle);
  }
  return { x, y };
}

/** 逼近曲线与目标图形的平均偏差，以图形宽度的百分比表示 */
function approximationError(model: FourierModel, harmonics: number) {
  const stride = 4;
  let total = 0;
  for (let index = 0; index < SAMPLE_COUNT; index += stride) {
    const point = evaluate(model.coefficients, harmonics, (TAU * index) / SAMPLE_COUNT);
    const target = model.targetPath[index];
    total += Math.hypot(point.x - target.x, point.y - target.y);
  }
  return (total / (SAMPLE_COUNT / stride)) * 50;
}

export function FourierOrbit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [harmonics, setHarmonics] = useState(DEFAULT_HARMONICS);
  const [shapeIndex, setShapeIndex] = useState(0);

  // 动画状态保存在 ref 中：主题切换、拖动滑块都不会让动画从零开始
  const harmonicsRef = useRef(harmonics);
  const shapeRef = useRef(shapeIndex);
  const phaseRef = useRef(0);
  const holdUntilRef = useRef(0);
  const autoCycleRef = useRef(true);
  // 静态模式（减少动效）下的重绘入口，由动画 effect 注册
  const redrawRef = useRef<(() => void) | null>(null);

  const { resolvedTheme } = useTheme();

  const error = useMemo(
    () => approximationError(getModels()[shapeIndex], harmonics),
    [shapeIndex, harmonics],
  );

  const selectShape = (index: number, manual: boolean) => {
    shapeRef.current = index;
    phaseRef.current = 0;
    holdUntilRef.current = 0;
    if (manual) autoCycleRef.current = false;
    setShapeIndex(index);
  };

  useEffect(() => {
    harmonicsRef.current = harmonics;
    redrawRef.current?.();
  }, [harmonics, shapeIndex]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const models = getModels();

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const dark = resolvedTheme !== "light";

    const colors = dark
      ? {
          target: "rgba(110, 231, 183, 0.22)",
          orbit: "rgba(110, 231, 183, 0.16)",
          vector: "rgba(52, 211, 153, 0.5)",
          trace: "rgba(52, 211, 153, 1)",
          tip: "rgba(209, 250, 229, 1)",
        }
      : {
          target: "rgba(5, 150, 105, 0.22)",
          orbit: "rgba(5, 150, 105, 0.14)",
          vector: "rgba(16, 185, 129, 0.5)",
          trace: "rgba(5, 150, 105, 0.95)",
          tip: "rgba(4, 120, 87, 1)",
        };

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let lastTime = performance.now();
    let visible = true;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));

      const pixelWidth = Math.floor(width * dpr);
      const pixelHeight = Math.floor(height * dpr);
      // 只在尺寸真正变化时重设 canvas，避免主题切换时清空画面。
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const toScreen = (point: Point, scale: number) => ({
      x: width / 2 + point.x * scale,
      y: height / 2 - point.y * scale,
    });

    const drawTarget = (model: FourierModel, scale: number) => {
      context.beginPath();
      model.targetPath.forEach((point, index) => {
        const { x, y } = toScreen(point, scale);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.closePath();
      context.setLineDash([3, 5]);
      context.strokeStyle = colors.target;
      context.lineWidth = 1;
      context.stroke();
      context.setLineDash([]);
    };

    /** 画出 [0, upTo] 区间的逼近曲线；按当前 N 实时重算，拖动滑块立即生效 */
    const drawTrace = (model: FourierModel, harmonicCount: number, upTo: number, scale: number) => {
      const steps = Math.max(2, Math.floor((upTo / TAU) * 360));
      context.beginPath();
      for (let step = 0; step <= steps; step++) {
        const { x, y } = toScreen(
          evaluate(model.coefficients, harmonicCount, (step / steps) * upTo),
          scale,
        );
        if (step === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.save();
      context.strokeStyle = colors.trace;
      context.lineWidth = 2.2;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.shadowColor = colors.trace;
      context.shadowBlur = 10;
      context.stroke();
      context.restore();
    };

    const drawEpicycles = (model: FourierModel, harmonicCount: number, time: number, scale: number) => {
      let current: Point = { x: 0, y: 0 };

      for (let index = 0; index < harmonicCount; index++) {
        const { frequency, amplitude, phase } = model.coefficients[index];
        const angle = frequency * time + phase;
        const next = {
          x: current.x + amplitude * Math.cos(angle),
          y: current.y + amplitude * Math.sin(angle),
        };
        const from = toScreen(current, scale);
        const to = toScreen(next, scale);

        // 只画大圆，小圆密集重叠只会变成噪声
        if (index < 16 && amplitude * scale > 1.5) {
          context.beginPath();
          context.arc(from.x, from.y, amplitude * scale, 0, TAU);
          context.strokeStyle = colors.orbit;
          context.lineWidth = 0.8;
          context.stroke();
        }

        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.strokeStyle = colors.vector;
        context.lineWidth = index === 0 ? 1.4 : 0.8;
        context.stroke();

        current = next;
      }

      const tip = toScreen(current, scale);
      context.beginPath();
      context.arc(tip.x, tip.y, 3.2, 0, TAU);
      context.fillStyle = colors.tip;
      context.fill();
    };

    const render = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (!prefersReducedMotion && visible) {
        if (holdUntilRef.current === 0) {
          phaseRef.current += delta * DRAW_SPEED;
          if (phaseRef.current >= TAU) {
            phaseRef.current = TAU;
            holdUntilRef.current = now + HOLD_MS;
          }
        } else if (now >= holdUntilRef.current) {
          // 停留结束：自动轮播到下一个图形；用户手动选过则重画当前图形
          const next = autoCycleRef.current
            ? (shapeRef.current + 1) % SHAPES.length
            : shapeRef.current;
          shapeRef.current = next;
          phaseRef.current = 0;
          holdUntilRef.current = 0;
          setShapeIndex(next);
        }
      }

      const model = models[shapeRef.current];
      const harmonicCount = harmonicsRef.current;
      const scale = Math.min(width, height) * 0.4;

      context.clearRect(0, 0, width, height);
      drawTarget(model, scale);

      if (prefersReducedMotion) {
        // 静态模式：直接画出完整逼近曲线，并在拖动滑块/切换图形时重绘
        drawTrace(model, harmonicCount, TAU, scale);
        return;
      }

      drawTrace(model, harmonicCount, phaseRef.current, scale);
      drawEpicycles(model, harmonicCount, phaseRef.current, scale);
      animationFrame = requestAnimationFrame(render);
    };

    resize();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (prefersReducedMotion) render(performance.now());
    });
    resizeObserver.observe(container);

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true;
        if (visible && !prefersReducedMotion) {
          lastTime = performance.now();
        }
      },
      { threshold: 0.05 },
    );
    visibilityObserver.observe(container);

    if (prefersReducedMotion) {
      redrawRef.current = () => render(performance.now());
      render(performance.now());
    } else {
      animationFrame = requestAnimationFrame(render);
    }

    return () => {
      redrawRef.current = null;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
    };
    // 动画模式通过 ref 读取最新的 N 与图形，只在主题变化时重建
  }, [resolvedTheme]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div ref={containerRef} className="relative aspect-square w-full">
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          role="img"
          aria-label={`傅里叶本轮正在用 ${harmonics} 个旋转向量画出「${SHAPES[shapeIndex].label}」`}
        />
      </div>

      <div className="flex flex-col gap-3 font-mono text-xs text-muted-foreground">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <label htmlFor="fourier-harmonics" className="text-foreground/80">
            N
          </label>
          <input
            id="fourier-harmonics"
            type="range"
            min={1}
            max={MAX_HARMONICS}
            step={1}
            value={harmonics}
            onChange={(event) => setHarmonics(Number(event.target.value))}
            className="w-full cursor-pointer accent-emerald-600 dark:accent-emerald-400"
            aria-describedby="fourier-error"
          />
          <output
            id="fourier-error"
            htmlFor="fourier-harmonics"
            className="min-w-[10ch] text-right tabular-nums text-foreground/80"
          >
            {String(harmonics).padStart(2, " ")} · 误差 {error.toFixed(1)}%
          </output>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="切换目标图形">
          {SHAPES.map((shape, index) => (
            <button
              key={shape.key}
              type="button"
              aria-pressed={index === shapeIndex}
              onClick={() => selectShape(index, true)}
              className="rounded-full border border-border/70 px-3 py-1 font-sans text-xs transition-colors hover:border-emerald-500/50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 aria-pressed:border-emerald-500/70 aria-pressed:bg-emerald-500/10 aria-pressed:text-foreground"
            >
              {shape.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
