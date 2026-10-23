"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

const SAMPLE_COUNT = 256;
const HARMONICS = 32;
const TAU = Math.PI * 2;

interface ComplexCoefficient {
  frequency: number;
  amplitude: number;
  phase: number;
}

interface Point {
  x: number;
  y: number;
}

/**
 * 心形参数方程：
 * x = 16 sin^3(t)
 * y = 13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)
 */
function heartPoint(t: number): Point {
  return {
    x: 16 * Math.sin(t) ** 3,
    y:
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t),
  };
}

/**
 * 对心形路径做离散傅里叶变换，得到一组旋转向量（本轮 / epicycles）。
 * 保留振幅最大的若干项，就能用简单的旋转叠加出复杂曲线。
 */
function buildFourierModel() {
  const raw = Array.from({ length: SAMPLE_COUNT }, (_, index) =>
    heartPoint((index / SAMPLE_COUNT) * TAU),
  );

  const minX = Math.min(...raw.map((point) => point.x));
  const maxX = Math.max(...raw.map((point) => point.x));
  const minY = Math.min(...raw.map((point) => point.y));
  const maxY = Math.max(...raw.map((point) => point.y));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const scale = Math.max(maxX - minX, maxY - minY) / 2;

  const targetPath = raw.map((point) => ({
    x: (point.x - centerX) / scale,
    y: (point.y - centerY) / scale,
  }));

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
      .slice(0, HARMONICS),
    targetPath,
  };
}

export function FourierOrbit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 动画相位与轨迹保存在 ref 中，主题切换导致 effect 重建时不会从零开始。
  const phaseRef = useRef(0);
  const traceRef = useRef<Point[]>([]);

  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const { coefficients, targetPath } = buildFourierModel();

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const dark = resolvedTheme !== "light";

    const colors = dark
      ? {
          target: "rgba(110, 231, 183, 0.2)",
          orbit: "rgba(110, 231, 183, 0.34)",
          vector: "rgba(52, 211, 153, 0.62)",
          trace: "rgba(52, 211, 153, 1)",
          tip: "rgba(209, 250, 229, 1)",
        }
      : {
          target: "rgba(5, 150, 105, 0.18)",
          orbit: "rgba(5, 150, 105, 0.28)",
          vector: "rgba(16, 185, 129, 0.55)",
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

    const getScale = () => Math.min(width, height) * 0.34;

    const drawTarget = (scale: number) => {
      const centerX = width / 2;
      const centerY = height / 2;

      context.beginPath();
      targetPath.forEach((point, index) => {
        const x = centerX + point.x * scale;
        const y = centerY - point.y * scale;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.closePath();
      context.strokeStyle = colors.target;
      context.lineWidth = 1.2;
      context.stroke();
    };

    const drawEpicycles = (time: number, scale: number) => {
      const centerX = width / 2;
      const centerY = height / 2;
      let x = 0;
      let y = 0;

      coefficients.forEach((coefficient, index) => {
        const angle = coefficient.frequency * time + coefficient.phase;
        const nextX = x + coefficient.amplitude * Math.cos(angle);
        const nextY = y + coefficient.amplitude * Math.sin(angle);

        const currentScreenX = centerX + x * scale;
        const currentScreenY = centerY - y * scale;
        const nextScreenX = centerX + nextX * scale;
        const nextScreenY = centerY - nextY * scale;

        if (index > 0 && index < 16) {
          context.beginPath();
          context.arc(
            currentScreenX,
            currentScreenY,
            coefficient.amplitude * scale,
            0,
            TAU,
          );
          context.strokeStyle = colors.orbit;
          context.lineWidth = 0.8;
          context.stroke();
        }

        context.beginPath();
        context.moveTo(currentScreenX, currentScreenY);
        context.lineTo(nextScreenX, nextScreenY);
        context.strokeStyle = colors.vector;
        context.lineWidth = index === 0 ? 1.5 : 0.9;
        context.stroke();

        x = nextX;
        y = nextY;
      });

      const tipX = centerX + x * scale;
      const tipY = centerY - y * scale;

      traceRef.current.push({ x: tipX, y: tipY });

      if (traceRef.current.length > 1) {
        context.beginPath();
        traceRef.current.forEach((point, index) => {
          if (index === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.save();
        context.strokeStyle = colors.trace;
        context.lineWidth = 2.2;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.shadowColor = colors.trace;
        context.shadowBlur = 12;
        context.stroke();
        context.restore();
      }

      context.beginPath();
      context.arc(tipX, tipY, 3.2, 0, TAU);
      context.fillStyle = colors.tip;
      context.fill();
    };

    const render = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (!prefersReducedMotion && visible) {
        const nextPhase = phaseRef.current + delta * 0.62;

        if (nextPhase >= TAU) {
          // 到达起点立即开始下一圈，不等待。
          phaseRef.current = nextPhase - TAU;
          traceRef.current = [];
        } else {
          phaseRef.current = nextPhase;
        }
      }

      context.clearRect(0, 0, width, height);
      const scale = getScale();

      drawTarget(scale);
      drawEpicycles(phaseRef.current, scale);

      if (prefersReducedMotion) {
        // 静态模式下补全整条轨迹，避免只显示一个点。
        for (let index = 0; index < 120; index++) {
          drawEpicycles(phaseRef.current + (index / 120) * TAU, scale);
        }
        return;
      }

      animationFrame = requestAnimationFrame(render);
    };

    resize();
    const resizeObserver = new ResizeObserver(() => {
      resize();
      traceRef.current = [];
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
      render(performance.now());
    } else {
      animationFrame = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, [resolvedTheme]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
    </div>
  );
}
