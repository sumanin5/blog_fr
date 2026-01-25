"use client";

import React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type VariantProps } from "class-variance-authority";

interface AdminActionButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  icon?: LucideIcon;
  loadingText?: string;
  asChild?: boolean;
}

/**
 * 后台专用高反馈按钮
 * 1. 自动处理 Loading 状态切换图标
 * 2. 内置微交互动画
 * 3. 统一 Loading 文本样式
 */
export function AdminActionButton({
  isLoading,
  icon: Icon,
  loadingText,
  children,
  className,
  disabled,
  variant = "default",
  size = "default",
  ...props
}: AdminActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={isLoading || disabled}
      className={cn(
        "relative rounded-full transition-all active:scale-95",
        isLoading && "opacity-80 cursor-not-allowed",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "flex items-center gap-2 transition-all",
          isLoading ? "opacity-0" : "opacity-100"
        )}
      >
        {Icon && <Icon className="size-3.5" />}
        {children}
      </span>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 animate-in fade-in duration-300">
          <Loader2 className="size-3.5 animate-spin" />
          {loadingText && (
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
              {loadingText}
            </span>
          )}
        </div>
      )}
    </Button>
  );
}
