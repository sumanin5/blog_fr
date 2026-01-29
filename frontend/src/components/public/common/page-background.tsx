"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PageBackgroundProps {
  className?: string;
  isFixed?: boolean;
}

export function PageBackground({
  className,
  isFixed = true,
}: PageBackgroundProps) {
  return (
    <div
      className={cn(
        "pointer-events-none z-0",
        isFixed ? "fixed inset-0" : "absolute inset-0",
        className,
      )}
    >
      {/* Mesh Grid */}
      <div className="absolute inset-0 bg-size-[32px_32px] bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)]" />

      {/* Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full opacity-50" />

      {/* Bottom Mask (optional for non-fixed) */}
      {!isFixed && (
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background" />
      )}
    </div>
  );
}
