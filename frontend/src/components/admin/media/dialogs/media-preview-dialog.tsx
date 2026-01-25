"use client";

import { type MediaFile } from "@/shared/api/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { MediaImage } from "../ui/media-image";
import { useMediaDownload } from "@/hooks/admin/media/use-media-download";

interface MediaPreviewDialogProps {
  file: MediaFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaPreviewDialog({
  file,
  open,
  onOpenChange,
}: MediaPreviewDialogProps) {
  const onDownload = useMediaDownload();

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background/95 border-none shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>资源预览: {file.originalFilename}</DialogTitle>
          <DialogDescription>
            正在预览媒体文件详情，包括文件名称、ID 和大小。
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full aspect-video flex items-center justify-center group">
          {file.mediaType === "image" ? (
            <MediaImage
              file={file}
              size="large"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-center space-y-4">
              <FileText className="size-20 mx-auto text-primary/40" />
              <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">
                No Visual Preview for this Type
              </p>
              <Button
                variant="outline"
                onClick={() => onDownload(file)}
                className="h-8 rounded-full border-primary/20 hover:bg-primary/10"
              >
                Download Asset
              </Button>
            </div>
          )}

          {/* 覆盖层 - 仅在有内容时且非空状态交互 */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
            <div className="flex items-center justify-between">
              <div className="text-foreground space-y-1">
                <p className="text-sm font-bold italic">
                  {file.originalFilename}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  ID: {file.id} / Size:{" "}
                  {((file.fileSize || 0) / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onDownload(file)}
                className="bg-accent/20 hover:bg-accent/30 text-foreground border-border backdrop-blur-xl"
              >
                <Download className="size-3.5 mr-2" /> Download Original
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
