"use client";

import React from "react";
import { Search, XCircle, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AdminSearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  totalCount?: number;
}

/**
 * 后台管理通用搜索组件 (手动提交增强版)
 * 1. 采用“输入-确认”模式，点击按钮或回车才触发查询，最大限度节省后端开销
 * 2. 交互流程：Typing -> Internal State -> [Enter/Click] -> External Sync
 */
export function AdminSearchInput({
  placeholder = "搜索数据...",
  value,
  onChange,
  totalCount,
}: AdminSearchInputProps) {
  // 本地缓冲区
  const [localValue, setLocalValue] = React.useState(value);

  // 响应外部重置
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // 执行搜索的核心逻辑
  const handleSearch = () => {
    // 只有当本地值真的变了，才向上传递
    onChange(localValue);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="flex items-center gap-4 bg-muted/40 p-2.5 rounded-2xl border backdrop-blur-sm shadow-inner transition-all hover:bg-muted/50 focus-within:ring-2 focus-within:ring-primary/5">
      <div className="relative flex-1 max-w-sm group">
        {/* 左侧装饰图标 */}
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />

        <Input
          placeholder={placeholder}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-14 h-9 border-none bg-background/40 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl placeholder:text-muted-foreground/30 font-medium"
        />

        {/* 内部动作区 */}
        <div className="absolute right-1 top-1 flex items-center gap-1">
          {/* 清除按钮 */}
          {localValue && (
            <button
              onClick={() => {
                setLocalValue("");
                onChange("");
              }}
              className="p-1.5 text-muted-foreground/30 hover:text-destructive transition-colors"
              title="清除查询"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          )}

          {/* 显式提交按钮：只有本地有值且与外部不一致时才高亮提示 */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSearch}
            className={`size-7 rounded-lg transition-all ${
              localValue !== value
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                : "text-muted-foreground/40"
            }`}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 统计指标区 - 增加点缀感 */}
      {totalCount !== undefined && (
        <div className="hidden sm:flex items-center gap-3 border-l pl-4 border-muted-foreground/10 h-6">
          <div className="flex flex-col items-start leading-none gap-0.5">
            <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-tighter">
              Results Found
            </span>
            <span className="text-sm font-mono font-bold tabular-nums text-primary/80">
              {totalCount}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
