"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Grid, List, Search, Trash2, Loader2, X } from "lucide-react";

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
  const [inputValue, setInputValue] = useState("");

  const handleSearch = useCallback(() => {
    onSearchChange?.(inputValue);
  }, [inputValue, onSearchChange]);

  const handleClearSearch = useCallback(() => {
    setInputValue("");
    onSearchChange?.("");
  }, [onSearchChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch]
  );

  return (
    <div className="flex items-center justify-between gap-4">
      {/* 搜索框 */}
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索文件名或描述..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-9"
          />
          {inputValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button onClick={handleSearch} size="sm">
          搜索
        </Button>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              已选择 {selectedCount} 个文件
            </span>
            <Button variant="outline" size="sm" onClick={onClearSelection}>
              清除选择
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onBatchDelete}
              disabled={isBatchDeleting}
            >
              {isBatchDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              批量删除
            </Button>
          </div>
        )}

        {/* 视图切换 */}
        <div className="flex items-center border rounded-lg">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("grid")}
            className="rounded-r-none"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("list")}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
