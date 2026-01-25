"use client";

import React from "react";
import { Grid, List, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminSearchInput } from "@/components/admin/common/admin-search-input";
import { AdminActionButton } from "@/components/admin/common/admin-action-button";

interface MediaToolbarProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  selectedCount: number;
  onClearSelection: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onBatchDelete?: () => void;
  isBatchDeleting?: boolean;
}

/**
 * 媒体库工具栏
 * 已全面接入 Admin 开头的标准原子组件
 */
export function MediaToolbar({
  viewMode,
  onViewModeChange,
  selectedCount,
  onClearSelection,
  searchQuery = "",
  onSearchChange,
  onBatchDelete,
  isBatchDeleting = false,
}: MediaToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
      {/* 搜索区：接入通用搜索组件，自动获得手动确定逻辑 */}
      <div className="w-full md:max-w-md">
        <AdminSearchInput
          placeholder="搜索文件名、原始路径或描述..."
          value={searchQuery}
          onChange={(val) => onSearchChange?.(val)}
        />
      </div>

      {/* 动作与视图切换区 */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
            <span className="text-[10px] font-bold text-primary px-2 py-1 bg-primary/10 rounded-lg uppercase tracking-tighter">
              Selected: {selectedCount}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              取消
            </Button>
            <AdminActionButton
              variant="destructive"
              size="sm"
              onClick={onBatchDelete}
              isLoading={isBatchDeleting}
              icon={Trash2}
              loadingText="Deleting"
              className="h-8 shadow-lg shadow-destructive/10"
            >
              批量移除
            </AdminActionButton>
          </div>
        )}

        {/* 视图模式切换组 - 稍微美化 */}
        <div className="flex items-center p-1 bg-muted/50 rounded-xl border">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onViewModeChange("grid")}
            className={`size-7 rounded-lg transition-all ${
              viewMode === "grid"
                ? "shadow-sm bg-background"
                : "hover:bg-transparent text-muted-foreground/60"
            }`}
          >
            <Grid className="size-3.5" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onViewModeChange("list")}
            className={`size-7 rounded-lg transition-all ${
              viewMode === "list"
                ? "shadow-sm bg-background"
                : "hover:bg-transparent text-muted-foreground/60"
            }`}
          >
            <List className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
