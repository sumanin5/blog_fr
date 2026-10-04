"use client";

import { useState } from "react";
import { type MediaFile } from "@/shared/api/types";
import { MediaImage } from "./media-image";
import { cn } from "@/lib/utils";
import { Check, Eye, Edit2, RefreshCw, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MediaCardProps {
  file: MediaFile;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  onPreview?: (file: MediaFile) => void;
  onRename?: (file: MediaFile) => void;
  onDelete?: (file: MediaFile) => void;
  onRegenerate?: (id: string) => void;
  onDownload?: (file: MediaFile) => void;
  mode?: "management" | "selection";
}

/**
 * 🃏 媒体资产卡片 (Selection & Management Mode)
 * 升级版：弃用不稳定的右键菜单，采用更高效的悬浮矩阵 + 双击预览
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
  const [showActions, setShowActions] = useState(false);

  const handleCardClick = () => {
    if (mode === "selection" && onToggleSelection) {
      onToggleSelection(file.id);
    }
  };

  const handleDoubleClick = () => {
    if (onPreview) onPreview(file);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(file.originalFilename);
    toast.success("文件名已复制");
  };

  // 简单的移动端检测 (实际项目中建议使用 useMediaQuery Hook)
  const handleTouch = () => {
    setShowActions(true);
    // 3秒后自动隐藏，模拟原生体验
    setTimeout(() => setShowActions(false), 3000);
  };

  return (
    <TooltipProvider>
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-300 cursor-pointer border-border/50 select-none",
          file.mediaType === "image" && "aspect-square",
          isSelected &&
            "ring-2 ring-primary border-primary bg-primary/5 shadow-lg",
          !isSelected &&
            "hover:shadow-xl hover:border-primary/30 hover:-translate-y-1"
        )}
        onClick={handleCardClick}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouch}
      >
        {/* 1. 顶部勾选区 (左上角) */}
        {onToggleSelection && (
          <div
            className="absolute top-3 left-3 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(file.id)}
              className={cn(
                "data-[state=checked]:bg-primary transition-all",
                !isSelected && "opacity-0 group-hover:opacity-100 bg-white/80"
              )}
            />
          </div>
        )}

        {/* 2. 图片主体与悬浮覆盖层 */}
        <CardContent className="p-0 h-full relative overflow-hidden">
          <MediaImage
            file={file}
            size="small"
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-50"
          />

          {/* 🚀 核心：悬浮操作条 (仅管理模式下显示) */}
          {mode === "management" && (
            <div
              className={cn(
                "absolute inset-0 z-20 transition-all duration-300 flex flex-col items-center justify-center gap-3",
                showActions
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              )}
            >
              <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-background/60 backdrop-blur-xl border border-border shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                <QuickAction
                  icon={<Eye className="size-4" />}
                  label="预览"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview?.(file);
                  }}
                />
                <QuickAction
                  icon={<Download className="size-4" />}
                  label="下载"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload?.(file);
                  }}
                />
                <QuickAction
                  icon={<Edit2 className="size-4" />}
                  label="重命名"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRename?.(file);
                  }}
                />
                {file.mediaType === "image" && (
                  <QuickAction
                    icon={<RefreshCw className="size-4" />}
                    label="核销缩略图"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegenerate?.(file.id);
                    }}
                  />
                )}
                <Separator orientation="vertical" className="h-4 mx-0.5" />
                <QuickAction
                  icon={<Trash2 className="size-4 text-destructive" />}
                  label="永久删除"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(file);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="h-6 text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-[0.2em] bg-accent/20 px-3 rounded-full backdrop-blur-xs border-none shadow-none"
              >
                Copy Meta
              </Button>
            </div>
          )}

          {/* 挑选模式标识 */}
          {mode === "selection" && (
            <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 backdrop-blur-[1px]">
              <div className="bg-primary text-primary-foreground p-2 rounded-full shadow-lg">
                <Check className="size-6" strokeWidth={3} />
              </div>
            </div>
          )}
        </CardContent>

        {/* 3. 底部信息区 */}
        <CardFooter className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-background/90 via-background/40 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-30">
          <div className="w-full text-foreground">
            <p className="text-[10px] font-bold truncate italic opacity-90">
              {file.originalFilename}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[8px] font-mono text-muted-foreground uppercase">
                {file.mediaType}
              </span>
              <span className="text-[8px] font-mono text-muted-foreground">
                {(file.fileSize / 1024 / 1024).toFixed(2)}MB
              </span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}

/**
 * ⚡ 快捷动作小组件
 */
function QuickAction({
  icon,
  label,
  onClick,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  variant?: "default" | "destructive";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-8 rounded-full text-foreground hover:bg-accent/40",
            variant === "destructive" &&
              "text-destructive hover:bg-destructive/20 hover:text-destructive"
          )}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="text-[10px] font-bold bg-black border-none uppercase tracking-widest px-2 py-1"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
