import { useState, useCallback } from "react";
import { Upload, X, Loader2, RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUploadFile } from "@/hooks/admin/use-media";
import { MediaImage } from "../ui/media-image";
import { toast } from "sonner";
import type { MediaFile } from "@/shared/api/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CoverUploadProps {
  currentCover?: MediaFile | null;
  onCoverChange: (file: MediaFile | null) => void;
  onUploadSuccess?: (file: MediaFile) => void;
  onOpenLibrary?: () => void;
  disabled?: boolean;
  className?: string;
}

export function CoverUpload({
  currentCover,
  onCoverChange,
  onUploadSuccess,
  onOpenLibrary,
  disabled = false,
  className,
}: CoverUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const uploadMutation = useUploadFile();

  const handleFileSelect = useCallback(
    async (file: File) => {
      // 这里的校验逻辑保持不变，为了节省 Token 略去不改
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
        const uploadedFile =
          (result as unknown as { file: MediaFile }).file ||
          (result as unknown as MediaFile);
        if (uploadedFile) {
          onCoverChange(uploadedFile);
          onUploadSuccess?.(uploadedFile);
          toast.success("封面已更新");
        }
      } catch {
        // Error handled by mutation
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

  const handleUploadClick = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation(); // 防止冒泡
      if (disabled) return;
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) handleFileSelect(file);
      };
      input.click();
    },
    [disabled, handleFileSelect]
  );

  const handleLibraryClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // 阻止触发 dropzone 的点击
      onOpenLibrary?.();
    },
    [onOpenLibrary]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCoverChange(null);
    },
    [onCoverChange]
  );

  const isLoading = uploadMutation.isPending;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
          Cover Visual
        </label>
        {isLoading && (
          <span className="text-[9px] font-mono animate-pulse text-primary">
            SYNCING...
          </span>
        )}
      </div>

      <TooltipProvider>
        <div
          className={cn(
            "group relative w-full aspect-video rounded-3xl border-2 border-dashed transition-all duration-300 overflow-hidden bg-muted/5",
            isDragging &&
              "border-primary bg-primary/5 ring-4 ring-primary/10 scale-[0.99]",
            !currentCover &&
              "hover:border-primary/50 hover:bg-muted/10 cursor-pointer",
            currentCover && "border-transparent shadow-lg bg-black/5"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!currentCover ? handleUploadClick : undefined}
        >
          {isLoading ? (
            // Loading State
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="mt-3 text-[10px] uppercase font-bold tracking-widest text-primary/80">
                Uploading...
              </p>
            </div>
          ) : currentCover ? (
            // Filled State (Smart Pod)
            <>
              <MediaImage
                file={currentCover}
                size="large"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 group-hover:brightness-[0.8]"
              />

              {/* 悬浮操作舱 */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                <div className="flex items-center gap-2 p-1.5 bg-background/80 backdrop-blur-xl border border-border rounded-full shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-full text-foreground hover:bg-accent/30"
                        onClick={handleUploadClick}
                      >
                        <RefreshCw className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-bold uppercase">
                      Replace
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-full text-foreground hover:bg-accent/30"
                        onClick={handleLibraryClick}
                      >
                        <Layers className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-bold uppercase">
                      Library
                    </TooltipContent>
                  </Tooltip>

                  <div className="w-px h-4 bg-border mx-0.5" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={handleRemove}
                      >
                        <X className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-bold uppercase text-destructive">
                      Remove
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* 底部信息条 */}
              <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="bg-background/80 backdrop-blur-md px-2 py-1 rounded-md text-[9px] font-mono text-foreground/80 uppercase">
                  {currentCover.originalFilename}
                </div>
                <div className="bg-background/80 backdrop-blur-md px-2 py-1 rounded-md text-[9px] font-mono text-muted-foreground">
                  {currentCover.width} x {currentCover.height}
                </div>
              </div>
            </>
          ) : (
            // Empty State
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <div className="size-16 rounded-full bg-muted/30 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-primary/10 group-hover:text-primary">
                <Upload className="size-7 opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-foreground/70 group-hover:text-primary transition-colors">
                  Drag Cover Here
                </p>
                <div className="flex items-center gap-2 justify-center text-[10px] font-mono opacity-50">
                  <span>OR</span>
                </div>
              </div>

              {/* 这里的 Library 按钮即使在 Empty State 也要显眼 */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 text-[9px] font-bold uppercase tracking-widest bg-muted/50 hover:bg-primary hover:text-white shadow-sm transition-all"
                onClick={handleLibraryClick}
              >
                <Layers className="size-3 mr-1.5" />
                Browse Vault
              </Button>
            </div>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
