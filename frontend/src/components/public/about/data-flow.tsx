"use client";

import React from "react";
import { motion } from "framer-motion";
import { GitBranch, Server, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface FlowNodeProps {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
  delay: number;
  active?: boolean;
  className?: string;
}

interface FlowStepProps {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
  delay: number;
  active?: boolean;
  badge: string;
  badgeColor: string;
  description: string;
}

interface FlowArrowProps {
  delay: number;
  direction: "horizontal" | "vertical";
  className?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

function FlowNode({
  icon: Icon,
  title,
  desc,
  color,
  delay,
  active = false,
  className,
}: FlowNodeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, type: "spring" }}
      className={cn(
        "group relative flex flex-col items-center p-6 bg-card border rounded-2xl transition-all duration-500 hover:shadow-lg",
        active
          ? "border-primary/40 shadow-[0_0_20px_rgba(var(--color-primary),0.1)] ring-1 ring-primary/20 bg-primary/5"
          : "border-border/40",
        className,
      )}
    >
      <div
        className={cn(
          "mb-4 p-4 rounded-xl transition-colors",
          color,
          "bg-background border border-border/50 shadow-xs",
        )}
      >
        <Icon className="w-8 h-8" />
      </div>
      <div className="text-center space-y-1">
        <h4 className="text-sm font-bold tracking-tight">{title}</h4>
        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter opacity-60">
          {desc}
        </p>
      </div>

      {/* Decorative pulse for active node */}
      {active && (
        <span className="absolute inset-0 rounded-2xl animate-pulse bg-primary/5 pointer-events-none" />
      )}
    </motion.div>
  );
}

function FlowArrow({ delay, direction, className }: FlowArrowProps) {
  const isHorizontal = direction === "horizontal";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        isHorizontal ? "w-24 h-4" : "h-12 w-4",
        className,
      )}
    >
      <motion.div
        initial={isHorizontal ? { scaleX: 0 } : { scaleY: 0 }}
        whileInView={isHorizontal ? { scaleX: 1 } : { scaleY: 1 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.8, ease: "easeInOut" }}
        className={cn(
          "bg-border/30 rounded-full origin-left overflow-hidden",
          isHorizontal ? "w-full h-[2px]" : "h-full w-[2px]",
        )}
      >
        <motion.div
          animate={
            isHorizontal ? { x: ["-100%", "100%"] } : { y: ["-100%", "100%"] }
          }
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className={cn(
            "bg-linear-to-r from-transparent via-primary/50 to-transparent",
            isHorizontal ? "w-1/2 h-full" : "h-1/2 w-full bg-linear-to-b",
          )}
        />
      </motion.div>
    </div>
  );
}

function FlowArrowWrapper({ delay }: { delay: number }) {
  return (
    <div className="relative shrink-0 flex items-center justify-center md:pt-[90px] w-full md:w-16 h-16 md:h-auto my-4 md:my-0">
      <FlowArrow
        delay={delay}
        direction="horizontal"
        className="hidden md:flex w-full"
      />
      <FlowArrow
        delay={delay}
        direction="vertical"
        className="flex md:hidden h-12"
      />
    </div>
  );
}

function FlowStep({
  icon,
  title,
  desc,
  color,
  delay,
  active,
  badge,
  badgeColor,
  description,
}: FlowStepProps) {
  return (
    <div className="flex flex-col items-center flex-1 min-w-0 w-full md:w-auto z-10">
      {/* 上半部分：卡片 */}
      <div className="w-full max-w-[280px] h-[180px] flex">
        <FlowNode
          icon={icon}
          title={title}
          desc={desc}
          color={color}
          delay={delay}
          active={active}
          className="w-full h-full justify-center"
        />
      </div>

      {/* 下半部分：描述 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.2 }}
        className="mt-8 text-center space-y-3 px-2 max-w-[280px]"
      >
        <div className="flex justify-center">
          <span
            className={cn(
              "text-[10px] font-mono border px-2 py-0.5 rounded tracking-wider font-bold",
              badgeColor,
            )}
          >
            {badge}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed text-balance">
          {description}
        </p>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DataFlowVisual() {
  return (
    <div className="relative w-full py-20 overflow-hidden rounded-[3rem] border border-border/40 bg-card/10 backdrop-blur-md">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,var(--color-primary)_0%,transparent_70%)]" />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-16 space-y-2">
          <h3 className="text-2xl font-bold tracking-tight">
            Full-Stack Data Flow
          </h3>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
            From Code to Content
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative">
          {/* Step 1: Input */}
          <FlowStep
            icon={GitBranch}
            title="GitOps Source"
            desc="Markdown / MDX"
            color="text-orange-500"
            delay={0}
            badge="INPUT"
            badgeColor="text-orange-500 border-orange-500/30 bg-orange-500/10"
            description="开发者在本地或 GitHub 提交 Markdown 文件。"
          />

          <FlowArrowWrapper delay={0.2} />

          {/* Step 2: Processing */}
          <FlowStep
            icon={Server}
            title="FastAPI Engine"
            desc="GitOps Container"
            color="text-emerald-500"
            delay={0.4}
            active
            badge="PROCESSING"
            badgeColor="text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
            description="后端扫描仓库变更，执行增量同步，将元数据与 HTML 持久化至数据库。"
          />

          <FlowArrowWrapper delay={0.6} />

          {/* Step 3: Output */}
          <FlowStep
            icon={Monitor}
            title="Next.js SSR/CSR"
            desc="Hybrid Rendering"
            color="text-blue-500"
            delay={0.8}
            badge="OUTPUT"
            badgeColor="text-blue-500 border-blue-500/30 bg-blue-500/10"
            description="Next.js 通过 Server Components 获取数据，实现高 SEO 性能的极速渲染。"
          />
        </div>
      </div>
    </div>
  );
}
