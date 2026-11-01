"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useTheme } from "next-themes";

export interface TerrainCategory {
  id: string;
  name: string;
  href: Route;
  postCount: number;
  summary: string;
}

interface Landmark extends TerrainCategory {
  x: number; // 0..1
  y: number; // 0..1
  peak: number; // 相对海拔
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const ENTRY = { x: 0.08, y: 0.86 };
const CELL = 7; // marching squares 网格尺寸（px）
const LEVELS = 18;

/**
 * 确定性布局：文章多的专栏靠近中心，其余沿黄金角螺旋向外排布。
 * 同样的数据永远得到同一张地图（地图需要稳定，不能每次访问都变）。
 */
function layout(categories: TerrainCategory[]): Landmark[] {
  const sorted = [...categories].sort(
    (a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name),
  );
  const maxCount = Math.max(1, ...sorted.map((c) => c.postCount));
  const center = { x: 0.56, y: 0.48 };

  return sorted.map((category, index) => {
    const radius = sorted.length === 1 ? 0 : 0.12 + 0.34 * Math.sqrt(index / (sorted.length - 1));
    const angle = index * GOLDEN_ANGLE - Math.PI / 3;
    return {
      ...category,
      x: Math.min(0.9, Math.max(0.2, center.x + Math.cos(angle) * radius * 0.85)),
      y: Math.min(0.82, Math.max(0.18, center.y + Math.sin(angle) * radius * 0.75)),
      peak: 0.55 + 0.45 * (category.postCount / maxCount),
    };
  });
}

// 固定参数的低频起伏：地图的“底层地貌”
const WAVES = [
  { fx: 1.3, fy: 1.1, p: 0.4, a: 0.16 },
  { fx: 3.0, fy: 2.6, p: 2.3, a: 0.08 },
  { fx: 4.7, fy: 4.1, p: 4.2, a: 0.053 },
  { fx: 6.4, fy: 5.6, p: 6.1, a: 0.04 },
];

function elevation(
  x: number,
  y: number,
  aspect: number,
  landmarks: Landmark[],
  pointer: { x: number; y: number } | null,
) {
  let value = 0;
  for (const w of WAVES) value += w.a * Math.sin(w.fx * x * aspect + w.p) * Math.cos(w.fy * y - w.p);
  for (const l of landmarks) {
    const d2 = ((x - l.x) * aspect) ** 2 + (y - l.y) ** 2;
    value += l.peak * Math.exp(-d2 / 0.03);
  }
  if (pointer) {
    const d2 = ((x - pointer.x) * aspect) ** 2 + (y - pointer.y) ** 2;
    value += 0.3 * Math.exp(-d2 / 0.006);
  }
  return value;
}

/**
 * 专栏地形图：专栏是地形上的“地点”，海拔与文章数成正比，虚线是从入口出发的阅读路径。
 * canvas 只画地形与路径；地点用真实链接叠加，保证键盘可达与读屏可读。
 */
export function CategoryTerrainMap({ categories }: { categories: TerrainCategory[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  const redrawRef = useRef<() => void>(() => {});
  const { resolvedTheme } = useTheme();

  const landmarks = useMemo(() => layout(categories), [categories]);

  useEffect(() => {
    activeRef.current = active;
    redrawRef.current();
  }, [active]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!container || !canvas || !context) return;

    const dark = resolvedTheme !== "light";
    const colors = dark
      ? { minor: "rgba(228, 236, 231, 0.10)", major: "rgba(52, 211, 153, 0.32)", trail: "rgba(52, 211, 153, 1)", page: "#080D0A" }
      : { minor: "rgba(23, 32, 27, 0.12)", major: "rgba(5, 150, 105, 0.32)", trail: "rgba(5, 150, 105, 1)", page: "#F8FAF9" };

    let width = 0;
    let height = 0;
    let frame = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      frame = 0;
      const aspect = width / height;
      const cols = Math.ceil(width / CELL) + 1;
      const rows = Math.ceil(height / CELL) + 1;
      const field = new Float32Array(cols * rows);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          field[j * cols + i] = elevation((i * CELL) / width, (j * CELL) / height, aspect, landmarks, pointerRef.current);
        }
      }

      context.clearRect(0, 0, width, height);

      // 等高线：marching squares，只连接跨越等值线的格边中点
      for (let level = 1; level < LEVELS; level++) {
        const threshold = -0.3 + (level / LEVELS) * 1.5;
        const major = level % 5 === 0;
        context.strokeStyle = major ? colors.major : colors.minor;
        context.lineWidth = major ? 1.1 : 0.8;
        context.beginPath();
        for (let j = 0; j < rows - 1; j++) {
          for (let i = 0; i < cols - 1; i++) {
            const a = field[j * cols + i];
            const b = field[j * cols + i + 1];
            const c = field[(j + 1) * cols + i + 1];
            const d = field[(j + 1) * cols + i];
            const x = i * CELL;
            const y = j * CELL;
            const points: [number, number][] = [];
            if (a > threshold !== b > threshold) points.push([x + (CELL * (threshold - a)) / (b - a), y]);
            if (b > threshold !== c > threshold) points.push([x + CELL, y + (CELL * (threshold - b)) / (c - b)]);
            if (d > threshold !== c > threshold) points.push([x + (CELL * (threshold - d)) / (c - d), y + CELL]);
            if (a > threshold !== d > threshold) points.push([x, y + (CELL * (threshold - a)) / (d - a)]);
            if (points.length >= 2) {
              context.moveTo(points[0][0], points[0][1]);
              context.lineTo(points[1][0], points[1][1]);
            }
            if (points.length === 4) {
              context.moveTo(points[2][0], points[2][1]);
              context.lineTo(points[3][0], points[3][1]);
            }
          }
        }
        context.stroke();
      }

      // 阅读路径：入口 → 各专栏
      const ex = ENTRY.x * width;
      const ey = ENTRY.y * height;
      for (const landmark of landmarks) {
        const x = landmark.x * width;
        const y = landmark.y * height;
        const highlighted = activeRef.current === landmark.id;
        context.setLineDash([4, 6]);
        context.strokeStyle = colors.trail;
        context.globalAlpha = highlighted ? 0.95 : 0.35;
        context.lineWidth = highlighted ? 1.8 : 1.1;
        context.beginPath();
        context.moveTo(ex, ey);
        context.bezierCurveTo(ex + (x - ex) * 0.25, ey - height * 0.2, x - (x - ex) * 0.3, y + height * 0.16, x, y);
        context.stroke();
      }
      context.setLineDash([]);
      context.globalAlpha = 1;

      // 入口标记
      context.fillStyle = colors.page;
      context.strokeStyle = colors.trail;
      context.lineWidth = 1.5;
      context.beginPath();
      context.rect(ex - 5, ey - 5, 10, 10);
      context.fill();
      context.stroke();
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    redrawRef.current = schedule;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onPointerMove = (event: PointerEvent) => {
      if (prefersReducedMotion) return;
      const rect = container.getBoundingClientRect();
      pointerRef.current = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
      schedule();
    };
    const onPointerLeave = () => {
      pointerRef.current = null;
      schedule();
    };

    resize();
    draw();
    const observer = new ResizeObserver(() => {
      resize();
      schedule();
    });
    observer.observe(container);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      redrawRef.current = () => {};
    };
  }, [landmarks, resolvedTheme]);

  return (
    <figure className="relative">
      <div
        ref={containerRef}
        className="relative aspect-[21/9] min-h-[360px] w-full overflow-hidden rounded-2xl border border-border/60"
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

        <span
          className="pointer-events-none absolute font-mono text-[11px] text-muted-foreground"
          style={{ left: `${ENTRY.x * 100}%`, top: `calc(${ENTRY.y * 100}% + 12px)`, transform: "translateX(-50%)" }}
        >
          入口
        </span>

        {landmarks.map((landmark) => {
          const flip = landmark.x > 0.72;
          const isActive = active === landmark.id;
          const size = 12 + Math.round(landmark.peak * 8);
          return (
            <Link
              key={landmark.id}
              href={landmark.href}
              onMouseEnter={() => setActive(landmark.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(landmark.id)}
              onBlur={() => setActive(null)}
              className="group absolute flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              style={{
                left: `${landmark.x * 100}%`,
                top: `${landmark.y * 100}%`,
                transform: `translate(${flip ? "calc(-100% + " + size / 2 + "px)" : -size / 2 + "px"}, -50%)`,
                flexDirection: flip ? "row-reverse" : "row",
              }}
            >
              <span
                className="flex shrink-0 items-center justify-center rounded-full border-2 border-emerald-600 bg-background transition-transform group-hover:scale-110 dark:border-emerald-400"
                style={{ width: size, height: size }}
              >
                <span className="h-1/2 w-1/2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              </span>
              <span className={`flex flex-col ${flip ? "items-end text-right" : "items-start"}`}>
                <span className="whitespace-nowrap rounded bg-background/70 px-1 text-sm font-semibold text-foreground backdrop-blur-sm transition-colors group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                  {landmark.name}
                </span>
                <span className="px-1 font-mono text-[11px] text-muted-foreground">
                  {landmark.postCount} 篇
                </span>
                {isActive && landmark.summary && (
                  <span className="mt-1 max-w-[260px] rounded-md border border-border/60 bg-background/95 px-2.5 py-1.5 text-xs leading-relaxed text-muted-foreground shadow-sm">
                    {landmark.summary}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>● 专栏 · 海拔与文章数成正比</span>
        <span>┄ 从入口出发的阅读路径</span>
        <span>鼠标移过地图会扰动地形</span>
      </figcaption>
    </figure>
  );
}
