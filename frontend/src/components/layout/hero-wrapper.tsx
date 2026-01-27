import React from "react";
import { cn } from "@/lib/utils";

interface HeroWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function HeroWrapper({ children, className }: HeroWrapperProps) {
  return (
    <div className="relative min-h-screen bg-background transition-colors duration-300">
      {/* 1. 浅色模式背景：清爽的科技几何线条 */}
      <div
        className="fixed inset-0 z-0 opacity-100 transition-opacity dark:opacity-0 pointer-events-none"
        style={{
          // 浅色模式：极简科技网格
          backgroundImage: `url('https://images.unsplash.com/photo-1454117096348-e4abbeba002c?q=80&w=2000&auto=format&fit=crop')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          // 使用 Mask Image 让图片边缘自然淡出，融入背景，而不是简单地盖一层白色
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* 2. 暗色模式背景：深邃星空地球 */}
      <div
        className="fixed inset-0 z-0 opacity-0 transition-opacity dark:opacity-50 pointer-events-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* 内容区域 */}
      <div className={cn("relative z-10 flex flex-col", className)}>
        {children}
      </div>
    </div>
  );
}
