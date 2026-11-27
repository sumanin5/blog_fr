"use client";

import * as React from "react";

import { Badge as UiBadge } from "@/components/ui/badge";
import { Button as UiButton } from "@/components/ui/button";
import {
  Table as UiTable,
  TableCell as UiTableCell,
  TableHead as UiTableHead,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * MDX 正文专用 Button 包装器：
 * 允许长文本在窄屏（375px）自然折行并保持足够点击高度，不改变后台 UI 原语的默认行为。
 */
export function MdxButton({
  className,
  size,
  ...props
}: React.ComponentProps<typeof UiButton>) {
  const isIconSize = String(size ?? "").startsWith("icon");
  return (
    <UiButton
      size={size}
      className={cn(
        !isIconSize &&
          "h-auto min-h-9 max-w-full whitespace-normal break-words py-2 text-left leading-snug",
        className,
      )}
      {...props}
    />
  );
}

/**
 * MDX 正文专用 Badge 包装器：
 * 避免长标签在窄屏中横向撑破父容器。
 */
export function MdxBadge({
  className,
  ...props
}: React.ComponentProps<typeof UiBadge>) {
  return (
    <UiBadge
      className={cn(
        "max-w-full whitespace-normal break-words text-left leading-snug",
        className,
      )}
      {...props}
    />
  );
}

/**
 * MDX 正文专用 Table 包装器：保留外层横向滚动兜底并限制容器不撑破网格列。
 */
export function MdxTable({
  className,
  ...props
}: React.ComponentProps<typeof UiTable>) {
  return <UiTable className={cn("min-w-0 w-full", className)} {...props} />;
}

/**
 * MDX 正文专用 TableHead：允许表头在移动端折行，不强行 whitespace-nowrap。
 */
export function MdxTableHead({
  className,
  ...props
}: React.ComponentProps<typeof UiTableHead>) {
  return (
    <UiTableHead
      className={cn(
        "h-auto min-h-10 px-2.5 py-2.5 align-top whitespace-normal break-words sm:px-3",
        className,
      )}
      {...props}
    />
  );
}

/**
 * MDX 正文专用 TableCell：允许中文与长单元格内容自然换行与顶对齐。
 */
export function MdxTableCell({
  className,
  ...props
}: React.ComponentProps<typeof UiTableCell>) {
  return (
    <UiTableCell
      className={cn(
        "px-2.5 py-2.5 align-top whitespace-normal break-words leading-relaxed sm:px-3",
        className,
      )}
      {...props}
    />
  );
}

/**
 * MDX 内原生 GFM Markdown 表格兜底包装器：外包横向滚动容器防止窄屏溢出。
 */
export function MdxMarkdownTable({
  className,
  ...props
}: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="markdown-table-container"
      className="my-6 max-w-full overflow-x-auto"
    >
      <table className={cn("w-full", className)} {...props} />
    </div>
  );
}
