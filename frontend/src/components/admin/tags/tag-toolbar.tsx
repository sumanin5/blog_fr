"use client";

import React from "react";
import { RefreshCw, Trash2, Merge } from "lucide-react";
import { AdminSearchInput } from "../common/admin-search-input";
import { AdminActionButton } from "../common/admin-action-button";

interface TagToolbarProps {
  totalCount: number;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefetch: () => void;
  isFetching: boolean;
  onOpenCleanup: () => void;
  onOpenMerge: () => void;
}

export function TagToolbar({
  totalCount,
  searchTerm,
  onSearchChange,
  onRefetch,
  isFetching,
  onOpenCleanup,
  onOpenMerge,
}: TagToolbarProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight italic text-primary/90">
            标签治理
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest opacity-60">
            Tags Control Center / Data Sanitization
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 使用通用的高反馈按钮 */}
          <AdminActionButton
            variant="outline"
            size="sm"
            onClick={onRefetch}
            isLoading={isFetching}
            icon={RefreshCw}
            loadingText="Syncing"
            className="h-8 border-muted-foreground/10 hover:bg-muted"
          >
            强制同步
          </AdminActionButton>

          <AdminActionButton
            variant="destructive"
            size="sm"
            onClick={onOpenCleanup}
            icon={Trash2}
            className="h-8 shadow-lg shadow-destructive/10"
          >
            孤儿清理
          </AdminActionButton>

          <AdminActionButton
            size="sm"
            onClick={onOpenMerge}
            icon={Merge}
            className="h-8 shadow-lg shadow-primary/20"
          >
            逻辑合并
          </AdminActionButton>
        </div>
      </div>

      <AdminSearchInput
        placeholder="搜索标签名称、描述或标识符..."
        value={searchTerm}
        onChange={onSearchChange}
        totalCount={totalCount}
      />
    </div>
  );
}
