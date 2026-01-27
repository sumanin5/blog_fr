import React from "react";
import { cn } from "@/lib/utils";

interface HeroWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function HeroWrapper({ children, className }: HeroWrapperProps) {
  return (
    <div className={cn("relative min-h-screen", className)}>
      {/* 以前的背景图逻辑已移至 layout/GlobalBackground */}
      {children}
    </div>
  );
}
