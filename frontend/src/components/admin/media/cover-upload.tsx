"use client";

import { useState, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useUploadFile,
  getThumbnailUrl,
  type MediaFileResponse,
} from "@/hooks/use-media";
import { toast } from "sonner";

interface CoverUploadProps {
  /**
   * 当前封面文件信息
   */
  currentCover?: MediaFileResponse | null;

  /**
   * 封面变更回调
   */
  onCoverChange: (file: MediaFileResponse | null) => void;

  /**
   * 上传成功回调（可选）
   */
  onUploadSuccess?: (file: MediaFileResponse) => void;

  /**
   * 是否禁用
   */
  disabled?: boolean;

  /**
   * 自定义类名
   */
  className?: string;
}

export function CoverUpload({
  currentCover,
  onCoverChange,
  onUploadSuccess,
  disabled = false,
  className,
}: CoverUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const uploadMutation = useUploadFile();

  // 处理文件选择
  const handleFileSelect = useCallback(
    async (file: File) => {
      // 验证文件类型
      if (!file.type.startsWith("image/")) {
        toast.error("文件类型错误", {
          description: "请上传图片文件",
        });
        return;
      }

      // 验证文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("文件过大", {
          description: "图片大小不能超过 10MB",
        });
        return;
      }

      try {
        const result = await uploadMutation.mutateAsync({
          file,
          usage: "cover",
          isPublic: true, // 封面图通常是公开的
          altText: file.name,
        });

        if (result?.file) {
          onCoverChange(result.file);
          onUploadSuccess?.(result.file);
          toast.success("上传成功", {
            description: "封面图已更新",
          });
        }
      } catch (error) {
        toast.error("上传失败", {
          description: error instanceof Error ? error.message : "请重试",
        });
      }
    },
    [uploadMutation, onCoverChange, onUploadSuccess]
  );

  // 处理拖拽事件
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [disabled, handleFileSelect]
  );

  // 处理点击上传
  const handleClick = useCallback(() => {
    if (disabled) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    };
    input.click();
  }, [disabled, handleFileSelect]);

  // 处理删除
  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCoverChange(null);
      toast.info("已移除封面", {
        description: "封面图已清空",
      });
    },
    [onCoverChange]
  );

  const coverUrl = currentCover
    ? getThumbnailUrl(currentCover, "medium")
    : null;
  const isLoading = uploadMutation.isPending;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">封面图</label>
        {currentCover && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-1" />
            移除
          </Button>
        )}
      </div>

      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-colors",
          "hover:border-primary/50 cursor-pointer",
          isDragging && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed",
          !coverUrl && "aspect-video",
          coverUrl && "aspect-video"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">上传中...</p>
            </div>
          </div>
        ) : coverUrl ? (
          <div className="relative w-full h-full group">
            <img
              src={coverUrl}
              alt={currentCover?.alt_text || "封面图"}
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <div className="text-white text-center">
                <Upload className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm font-medium">点击或拖拽更换</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-4" />
            <p className="text-sm font-medium mb-1">点击上传或拖拽图片到此处</p>
            <p className="text-xs">支持 JPG、PNG、WebP 格式，最大 10MB</p>
          </div>
        )}
      </div>

      {currentCover && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>文件名: {currentCover.original_filename}</p>
          <p>
            尺寸: {currentCover.width} × {currentCover.height}px
          </p>
          <p>大小: {(currentCover.file_size / 1024).toFixed(2)} KB</p>
        </div>
      )}
    </div>
  );
}
