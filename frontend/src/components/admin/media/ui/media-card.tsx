"use client";

import { useMemo } from "react";
import { type MediaFile } from "@/shared/api/types";
import { MediaImage } from "./media-image";
import { cn } from "@/lib/utils";
import {
  Check,
  MoreVertical,
  Eye,
  Edit2,
  RefreshCw,
  Trash2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface MediaCardProps {
  file: MediaFile;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  // 即使在挑选模式下，也可能需要预览
  onPreview?: (file: MediaFile) => void;
  // 管理动作 (可选)
  onRename?: (file: MediaFile) => void;
  onDelete?: (file: MediaFile) => void;
  onRegenerate?: (id: string) => void;
  onDownload?: (file: MediaFile) => void;
  // 模式控制
  mode?: "management" | "selection";
}

/**
 * 🃏 媒体资产卡片 (Atomic Component)
 *
 * 基于 Shadcn Card 构建，封装了这一张卡片所有的：
 * 1. 样式布局 (无缝图片 + 底部信息)
 * 2. 交互状态 (选中高亮、悬浮菜单)
 * 3. 核心数据展示
 */
export function MediaCard({
  file,
  isSelected = false,
  onToggleSelection,
  onPreview,
  onRename,
  onDelete,
  onRegenerate,
  onDownload,
  mode = "management",
}: MediaCardProps) {
  // 交互处理器
  const handleCardClick = () => {
    if (mode === "selection" && onToggleSelection) {
      onToggleSelection(file.id);
    } else if (onPreview) {
      onPreview(file);
    }
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 cursor-pointer border-border/50",
        // 选中状态：高亮边框和背景
        isSelected &&
          "ring-2 ring-primary border-primary bg-primary/5 shadow-lg shadow-primary/10",
        // 悬浮状态：轻微上浮和阴影
        !isSelected &&
          "hover:shadow-xl hover:border-primary/30 hover:-translate-y-1"
      )}
      onClick={handleCardClick}
    >
      {/* 1. 顶部勾选区 (仅管理模式或多选模式显示) */}
      {onToggleSelection && (
        <div
          className="absolute top-3 left-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(file.id)}
            className={cn(
              "data-[state=checked]:bg-primary data-[state=checked]:border-primary",
              // 未选中时半透明，选中时实心
              !isSelected &&
                "bg-white/80 backdrop-blur border-black/10 opacity-0 group-hover:opacity-100 transition-opacity"
            )}
          />
        </div>
      )}

      {/* 2. 顶部菜单区 (仅管理模式显示) */}
      {mode === "management" && (
        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="size-8 rounded-lg bg-white/90 backdrop-blur shadow-sm hover:bg-white"
              >
                <MoreVertical className="size-4 text-foreground/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={() => onPreview?.(file)}>
                <Eye className="size-4 mr-2" /> 预览资源
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRename?.(file)}>
                <Edit2 className="size-4 mr-2" /> 重命名
              </DropdownMenuItem>
              {file.mediaType === "image" && (
                <DropdownMenuItem onClick={() => onRegenerate?.(file.id)}>
                  <RefreshCw className="size-4 mr-2" /> 刷新缩略图
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDownload?.(file)}>
                <Download className="size-4 mr-2" /> 下载原件
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(file)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="size-4 mr-2" /> 物理移除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* 3. 核心图片区 (无缝嵌入) */}
      <CardContent className="p-0 aspect-square bg-muted/30 relative">
        <MediaImage
          file={file}
          size="small"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          fallbackClassName="w-full h-full p-8 opacity-50"
        />

        {/* 挑选模式下的覆盖层 */}
        {mode === "selection" && !isSelected && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-[10px] font-bold text-white uppercase tracking-widest border border-white/30 px-3 py-1 rounded-full backdrop-blur-md">
              Select
            </span>
          </div>
        )}

        {/* 选中时的对勾标记 (挑选模式) */}
        {mode === "selection" && isSelected && (
          <div className="absolute top-3 right-3 size-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg animate-in zoom-in">
            <Check className="size-3.5" strokeWidth={4} />
          </div>
        )}
      </CardContent>

      {/* 4. 底部信息区 */}
      <CardFooter className="p-3 flex-col items-start gap-1.5 border-t bg-card/50 backdrop-blur-sm">
        <p
          className="text-[11px] font-bold truncate italic w-full text-foreground/90"
          title={file.originalFilename}
        >
          {file.originalFilename}
        </p>
        <div className="flex items-center justify-between w-full">
          <span className="text-[9px] font-mono font-bold uppercase text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-[4px]">
            {file.mediaType}
          </span>
          <span className="text-[9px] font-mono tabular-nums text-muted-foreground/40 italic">
            {(file.fileSize / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
