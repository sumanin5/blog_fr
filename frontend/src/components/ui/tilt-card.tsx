"use client";

import React, { useRef, useState } from "react";
import { motion, useSpring, useTransform, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface TiltCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  tiltAngle?: number;
  glareOpacity?: number;
}

/**
 * 👑 现代 3D 景深倾斜与聚光卡片 (3D Tilt & Spotlight Card)
 *
 * 核心特性：
 * 1. 物理弹簧缓动计算鼠标相对坐标与倾斜角度；
 * 2. 鼠标跟随聚光光斑（Spotlight Effect），呈现磨砂玻璃折射光感；
 * 3. 零额外依赖，纯 CSS 3D Transform 硬件加速，性能丝滑；
 * 4. 移开鼠标后平滑回正，杜绝生硬跳变。
 */
export function TiltCard({
  children,
  className,
  tiltAngle = 10,
  glareOpacity = 0.12,
  ...props
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [spotlightPos, setSpotlightPos] = useState({ x: 0, y: 0 });

  // 物理弹性动画值配置 (柔和高档阻尼感)
  const springConfig = { damping: 20, stiffness: 180, mass: 0.5 };
  const mouseX = useSpring(0, springConfig);
  const mouseY = useSpring(0, springConfig);

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [tiltAngle, -tiltAngle]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-tiltAngle, tiltAngle]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();

    // 归一化坐标 [-0.5, 0.5]
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    mouseX.set(x);
    mouseY.set(y);

    // 聚光光斑真实像素坐标
    setSpotlightPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div style={{ perspective: 1000 }} className="h-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className={cn(
          "relative h-full w-full rounded-2xl transition-shadow duration-300",
          isHovered ? "shadow-2xl shadow-emerald-500/10" : "shadow-sm",
          className
        )}
        {...props}
      >
        {/* 卡片核心内容 */}
        <div className="relative z-10 h-full w-full">{children}</div>

        {/* 鼠标动态聚光高光层 (Spotlight Glare) */}
        <div
          className="pointer-events-none absolute inset-0 z-20 rounded-2xl transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(400px circle at ${spotlightPos.x}px ${spotlightPos.y}px, rgba(16, 185, 129, ${glareOpacity}), transparent 80%)`,
          }}
        />

        {/* 边缘微弱高光边框反光 */}
        <div
          className="pointer-events-none absolute inset-0 z-20 rounded-2xl border border-emerald-500/20 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
          }}
        />
      </motion.div>
    </div>
  );
}
