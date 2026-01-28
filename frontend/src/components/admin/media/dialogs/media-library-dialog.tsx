"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { AdminActionButton } from "@/components/admin/common/admin-action-button";
import { Image as ImageIcon, Upload, Loader2, Filter } from "lucide-react";
import { AdminSearchInput } from "@/components/admin/common/admin-search-input";
import { useMediaFiles, useUploadFile } from "@/hooks/admin/use-media";
import { MediaCard } from "@/components/admin/media/ui/media-card";
import { toast } from "sonner";
import type { MediaFile, MediaType, FileUsage } from "@/shared/api/types";

interface MediaLibraryDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (file: MediaFile) => void;
  filter?: {
    mediaType?: MediaType;
    usage?: string;
    mimeType?: string;
  };
  multiple?: boolean;
}

export function MediaLibraryDialog({
  open,
  onClose,
  onSelect,
  filter,
  multiple = false,
}: MediaLibraryDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // 自动锁定 Tab：如果 filter 指定了 mediaType (或 mimeType暗示了类型)，则锁定
  const lockedType =
    filter?.mediaType ||
    (filter?.mimeType?.startsWith("image") ? "image" : undefined);
  const showTabs = !lockedType;

  // 初始化 Tab 状态
  const [selectedType, setSelectedType] = useState<string>(lockedType || "all");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // 1. 获取文件列表
  const { data, isLoading } = useMediaFiles({
    mediaType: (lockedType ||
      (selectedType === "all" ? undefined : selectedType)) as MediaType,
    usage: filter?.usage as FileUsage,
    mimeType: filter?.mimeType,
  });

  // 2. 搜索逻辑
  const filteredFiles = useMemo(() => {
    const items = data?.items || [];
    if (!searchQuery) return items;

    const query = searchQuery.toLowerCase();
    return items.filter(
      (file: MediaFile) =>
        file.originalFilename.toLowerCase().includes(query) ||
        file.description?.toLowerCase().includes(query) ||
        file.tags?.some((tag: string) => tag.toLowerCase().includes(query)),
    );
  }, [data, searchQuery]);

  // 3. 上传逻辑
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadFile({
        file,
        usage: lockedType === "image" ? "cover" : "general",
        isPublic: true,
      });

      // Auto-select the uploaded file
      // API normally returns the file object directly or nested
      const uploadedFile = (res as any).file || res;

      toast.success("Uploaded successfully");

      if (multiple) {
        // In multiple mode, just add to selection
        const newSelected = new Set(selectedFiles);
        newSelected.add(uploadedFile.id);
        setSelectedFiles(newSelected);
      } else {
        // In single mode, select and close
        onSelect(uploadedFile);
        onClose();
      }
    } catch {
      // Error is handled by UI toast usually
      toast.error("Upload failed");
    }
  };

  // 4. 选择逻辑
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
    const selected = filteredFiles.filter((file: MediaFile) =>
      selectedFiles.has(file.id),
    );
    selected.forEach((file: MediaFile) => onSelect(file));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-background">
        {/* Header Area */}
        <div className="p-6 border-b bg-muted/30 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <ImageIcon className="size-4" />
                </div>
                {lockedType ? `${lockedType} LIBRARY` : "MEDIA INVENTORY"}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-mono uppercase tracking-widest opacity-60 ml-1">
                {multiple ? "Multi-Select Mode" : "Select an asset to use"}
              </DialogDescription>
            </div>

            {/* In-Dialog Upload Action */}
            <div className="relative group">
              <AdminActionButton
                variant="outline"
                size="sm"
                className="rounded-full shadow-sm border-dashed border-2 hover:border-primary hover:text-primary transition-all text-xs font-bold uppercase tracking-wider"
                disabled={isUploading}
                isLoading={isUploading}
                loadingText="Uploading"
                icon={isUploading ? undefined : Upload}
              >
                Upload New
              </AdminActionButton>
              <Input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                accept={lockedType === "image" ? "image/*" : undefined}
                disabled={isUploading}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex-1 w-full">
              <AdminSearchInput
                placeholder="Filter media assets..."
                value={searchQuery}
                onChange={setSearchQuery}
                totalCount={filteredFiles.length}
              />
            </div>

            {showTabs && (
              <Tabs
                value={selectedType}
                onValueChange={setSelectedType}
                className="w-auto"
              >
                <TabsList className="h-10 bg-background border p-1 rounded-lg">
                  {["all", "image", "video", "document"].map((t) => (
                    <TabsTrigger
                      key={t}
                      value={t}
                      className="text-[10px] font-bold uppercase px-4 rounded-md"
                    >
                      {t}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/5 min-h-0">
          {isLoading ? (
            <div className="flex h-full items-center justify-center flex-col gap-3 opacity-50">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs font-mono uppercase">Loading Assets...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-4">
              <div className="p-4 bg-muted/30 rounded-full">
                <Filter className="size-8 opacity-20" />
              </div>
              <p className="text-sm font-medium">No assets found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredFiles.map((file: MediaFile) => (
                <MediaCard
                  key={file.id}
                  file={file}
                  isSelected={selectedFiles.has(file.id)}
                  onToggleSelection={() => handleSelectFile(file)}
                  mode="selection"
                  onPreview={() => handleSelectFile(file)} // 双击也可以选择
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer for Multiple Selection */}
        {multiple && selectedFiles.size > 0 && (
          <div className="p-4 border-t bg-background flex justify-between items-center">
            <span className="text-xs font-medium text-muted-foreground">
              {selectedFiles.size} assets selected
            </span>
            <AdminActionButton onClick={handleConfirmMultiple} size="sm">
              Confirm Selection
            </AdminActionButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
