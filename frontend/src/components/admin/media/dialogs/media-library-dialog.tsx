"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Image as ImageIcon,
  Video,
  FileText,
  Loader2,
} from "lucide-react";
import { useMediaFiles } from "@/hooks/admin/use-media";
import { MediaCard } from "../ui/media-card";
import type { MediaFile } from "@/shared/api/types";
import type { GetUserFilesData } from "@/shared/api";

interface MediaLibraryDialogProps {
  /**
   * 是否打开
   */
  open: boolean;

  /**
   * 关闭回调
   */
  onClose: () => void;

  /**
   * 选择文件回调
   */
  onSelect: (file: MediaFile) => void;

  /**
   * 过滤条件
   */
  filter?: {
    mediaType?: "image" | "video" | "document";
    usage?: string;
  };

  /**
   * 是否允许多选
   */
  multiple?: boolean;
}

/**
 * 📚 媒体挑选对话框 (Selector Dialog)
 *
 * 职责：
 * 1. 提供一个精美的界面从已上传的资源中挑选。
 * 2. 支持搜索、分类预览。
 * 3. 结果回调给外部，不负责业务删除/重命名。
 */
export function MediaLibraryDialog({
  open,
  onClose,
  onSelect,
  filter,
  multiple = false,
}: MediaLibraryDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // 1. 获取用户文件列表 (受控于 selectedType)
  const { data, isLoading } = useMediaFiles({
    mediaType:
      selectedType === "all"
        ? (filter?.mediaType as unknown as GetUserFilesData["query"]["media_type"])
        : (selectedType as unknown as GetUserFilesData["query"]["media_type"]),
    usage: filter?.usage as unknown as GetUserFilesData["query"]["usage"],
  });

  // 2. 搜索逻辑 (前端过滤，后端 API 暂时不支持全文搜索库挑选场景)
  const filteredFiles = useMemo(() => {
    const items = data?.items || [];
    if (!searchQuery) return items;

    const query = searchQuery.toLowerCase();
    return items.filter(
      (file) =>
        file.originalFilename.toLowerCase().includes(query) ||
        file.description?.toLowerCase().includes(query) ||
        file.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [data, searchQuery]);

  // 处理文件选择
  const handleSelectFile = (file: MediaFile) => {
    if (multiple) {
      const newSelected = new Set(selectedFiles);
      if (newSelected.has(file.id)) {
        newSelected.delete(file.id);
      } else {
        newSelected.add(file.id);
      }
      setSelectedFiles(newSelected);
    } else {
      onSelect(file);
      onClose();
    }
  };

  const handleConfirmMultiple = () => {
    const selected = filteredFiles.filter((file) => selectedFiles.has(file.id));
    selected.forEach((file) => onSelect(file));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
        {/* 精美 Header */}
        <div className="p-8 pb-4 border-b bg-muted/20">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tight text-primary/80 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <ImageIcon className="size-5 text-primary" />
              </div>
              全域媒体索引库
            </DialogTitle>
            <DialogDescription className="text-[10px] font-mono uppercase tracking-widest opacity-60">
              Select assets from the digital inventory{" "}
              {multiple && "/ MULTI-SELECT ENABLED"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="搜索文件名、描述或标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-11 bg-background border-none rounded-xl shadow-inner italic"
              />
            </div>

            <Tabs
              value={selectedType}
              onValueChange={setSelectedType}
              className="w-fit"
            >
              <TabsList className="bg-background p-1 rounded-xl h-11 border">
                <TabsTrigger
                  value="all"
                  className="rounded-lg px-6 uppercase text-[10px] font-bold"
                >
                  全部
                </TabsTrigger>
                <TabsTrigger
                  value="image"
                  className="rounded-lg px-6 uppercase text-[10px] font-bold"
                >
                  图片
                </TabsTrigger>
                <TabsTrigger
                  value="video"
                  className="rounded-lg px-6 uppercase text-[10px] font-bold"
                >
                  视频
                </TabsTrigger>
                <TabsTrigger
                  value="document"
                  className="rounded-lg px-6 uppercase text-[10px] font-bold"
                >
                  文档
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* 内容网格 */}
        <ScrollArea className="flex-1 p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-32 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">
                Syncing Assets...
              </p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-muted-foreground bg-muted/10 rounded-3xl border-2 border-dashed">
              <ImageIcon className="h-12 w-12 mb-4 opacity-10" />
              <p className="text-xs font-bold italic tracking-widest opacity-40 uppercase">
                No Matches Found
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-8">
              {filteredFiles.map((file) => (
                <MediaCard
                  key={file.id}
                  file={file}
                  isSelected={selectedFiles.has(file.id)}
                  onToggleSelection={
                    multiple ? (id) => handleSelectFile(file) : undefined
                  }
                  onPreview={() => !multiple && handleSelectFile(file)}
                  mode="selection"
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* 底部控制 */}
        <div className="p-6 border-t bg-muted/5 flex items-center justify-between">
          <div>
            {multiple && selectedFiles.size > 0 && (
              <p className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">
                Selected Units: {selectedFiles.size} / Global Buffer Ready
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="rounded-full text-[10px] uppercase font-bold tracking-widest"
            >
              Cancel
            </Button>
            {multiple ? (
              <Button
                onClick={handleConfirmMultiple}
                disabled={selectedFiles.size === 0}
                className="rounded-full px-8 font-bold uppercase tracking-widest shadow-lg shadow-primary/20"
              >
                Authorize Assets
              </Button>
            ) : (
              <div className="text-[9px] font-mono text-muted-foreground uppercase italic self-center">
                Close dialog to abort
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
