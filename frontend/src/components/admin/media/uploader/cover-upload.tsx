"use client";

import { useState, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUploadFile } from "@/hooks/admin/use-media";
import { MediaImage } from "../ui/media-image";
import { toast } from "sonner";
import type { MediaFile } from "@/shared/api/types";

interface CoverUploadProps {
  /**
   * 当前封面文件信息
   */
  currentCover?: MediaFile | null;

  /**
   * 封面变更回调
   */
  onCoverChange: (file: MediaFile | null) => void;

  /**
   * 上传成功回调（可选）
   */
  onUploadSuccess?: (file: MediaFile) => void;

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

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("文件类型错误", { description: "请上传图片文件" });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("文件过大", { description: "图片大小不能超过 10MB" });
        return;
      }

      try {
        const result = await uploadMutation.mutateAsync({
          file,
          usage: "cover",
          isPublic: true,
          altText: file.name,
        });

        // 假设 result 包含上传后的文件对象 (需要根据具体 SDK 返回结构调整)
        // 这里的 result.file 是旧结构，新结构可能是直接返回 MediaFile
        const uploadedFile = (result as any).file || result;

        if (uploadedFile) {
          onCoverChange(uploadedFile);
          onUploadSuccess?.(uploadedFile);
          toast.success("上传成功", { description: "封面图已更新" });
        }
      } catch (error) {
        // 拦截器通常会显示错误，这里做个兜底
      }
    },
    [uploadMutation, onCoverChange, onUploadSuccess]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
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
      if (files.length > 0) handleFileSelect(files[0]);
    },
    [disabled, handleFileSelect]
  );

  const handleClick = useCallback(() => {
    if (disabled) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileSelect(file);
    };
    input.click();
  }, [disabled, handleFileSelect]);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCoverChange(null);
      toast.info("已移除封面");
    },
    [onCoverChange]
  );

  const isLoading = uploadMutation.isPending;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
            Cover Asset
          </label>
        </div>
        {currentCover && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isLoading}
            className="h-7 text-[9px] uppercase font-bold tracking-tighter text-destructive hover:text-destructive hover:bg-destructive/5"
          >
            <X className="h-3 w-3 mr-1" />
            Erase Clear
          </Button>
        )}
      </div>

      <div
        className={cn(
          "relative border-2 border-dashed rounded-2xl transition-all duration-500 overflow-hidden",
          "hover:border-primary/40 hover:shadow-xl cursor-pointer",
          isDragging && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed",
          "aspect-video"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
            <p className="text-[9px] font-mono mt-2 uppercase tracking-widest opacity-40">
              Uploading Stream...
            </p>
          </div>
        ) : currentCover ? (
          <div className="relative w-full h-full group">
            <MediaImage
              file={currentCover}
              size="medium"
              className="w-full h-full object-cover rounded-xl"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
              <div className="text-white text-center transform translate-y-4 group-hover:translate-y-0 transition-transform">
                <Upload className="h-6 w-6 mx-auto mb-2 opacity-80" />
                <p className="text-[10px] font-bold uppercase tracking-widest">
                  Replace Identity
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted/5 group">
            <div className="p-4 rounded-full bg-muted/20 mb-4 group-hover:scale-110 transition-transform">
              <ImageIcon className="h-8 w-8 opacity-20" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
              Deploy Cover
            </p>
            <p className="text-[9px] mt-1 opacity-40">
              JPG / PNG / WEBP / MAX 10MB
            </p>
          </div>
        )}
      </div>

      {currentCover && !isLoading && (
        <div className="p-3 bg-muted/20 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-tighter text-muted-foreground/60">
            <span>Identity: {currentCover.originalFilename}</span>
            <span>
              {currentCover.width} × {currentCover.height}
            </span>
          </div>
          <div className="w-full bg-muted/30 h-1 rounded-full overflow-hidden">
            <div className="bg-primary/40 h-full w-[100%]" />
          </div>
        </div>
      )}
    </div>
  );
}
