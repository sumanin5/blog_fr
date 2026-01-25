"use client";

import { useState } from "react";
import { downloadFile, type MediaFile } from "@/shared/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Edit2,
  Image as ImageIcon,
  FileText,
  Loader2,
} from "lucide-react";
import { MediaImage } from "../ui/media-image";
import { MediaCard } from "../ui/media-card";
import { toast } from "sonner";
import type { AdminMediaList } from "@/shared/api/types";
import { AdminPagination } from "@/components/admin/layout/admin-pagination";
import { AdminTable } from "@/components/admin/common/admin-table";
import { getMediaColumns } from "./media-columns";

interface MediaGridProps {
  data?: AdminMediaList;
  isLoading: boolean;
  viewMode: "grid" | "list";
  selectedFiles: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  onPageChange?: (page: number) => void;
  // 注入外部 Mutation
  onDelete?: (id: string) => Promise<void>;
  onRename?: (id: string, name: string) => Promise<void>;
  onRegenerate?: (id: string) => Promise<void>;
}

export function MediaGrid({
  data,
  isLoading,
  viewMode,
  selectedFiles,
  onSelectionChange,
  onPageChange,
  onDelete,
  onRename,
  onRegenerate,
}: MediaGridProps) {
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [renameFile, setRenameFile] = useState<MediaFile | null>(null);
  const [newName, setNewName] = useState("");

  const handleRename = async () => {
    if (!renameFile || !newName.trim()) return;
    try {
      await onRename?.(renameFile.id, newName);
      setRenameFile(null);
    } catch {}
  };

  const toggleSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) newSelected.delete(fileId);
    else newSelected.add(fileId);
    onSelectionChange(newSelected);
  };

  const handleDelete = async (file: MediaFile) => {
    if (!confirm(`确定要删除 "${file.originalFilename}" 吗？`)) return;
    try {
      await onDelete?.(file.id);
    } catch {}
  };

  const handleDownload = async (file: MediaFile) => {
    try {
      const response = await downloadFile({
        path: { file_id: file.id },
        parseAs: "blob",
        throwOnError: true,
      });

      if (response.data) {
        const url = window.URL.createObjectURL(response.data as Blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.originalFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch {
      toast.error("下载失败");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = data?.items || [];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground bg-muted/10 rounded-3xl border-2 border-dashed border-muted-foreground/10">
        <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
        <p className="text-sm font-bold italic uppercase tracking-widest opacity-40">
          Zero Assets Detected
        </p>
        <p className="text-[10px] mt-1 font-mono uppercase tracking-widest opacity-30">
          The media inventory is currently void
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((file) => (
            <MediaCard
              key={file.id}
              file={file}
              isSelected={selectedFiles.has(file.id)}
              onToggleSelection={toggleSelection}
              onPreview={setPreviewFile}
              onRename={(file) => {
                setRenameFile(file);
                setNewName(file.originalFilename);
              }}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onRegenerate={onRegenerate}
              mode="management"
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden bg-card/50 backdrop-blur-sm">
          <AdminTable
            data={items}
            columns={getMediaColumns({
              onPreview: setPreviewFile,
              onRename: (file) => {
                setRenameFile(file);
                setNewName(file.originalFilename);
              },
              onDelete: handleDelete,
              onRegenerate,
            })}
            selectedRows={selectedFiles}
            onSelectionChange={onSelectionChange}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* 分页控制面板 */}
      {data && data.pages > 1 && (
        <AdminPagination
          page={data.page}
          pages={data.pages}
          total={data.total}
          onPageChange={(page) => onPageChange?.(page)}
        />
      )}

      {/* 预览对话框 - ✅ 修复 Accessibility 错误 (Add DialogTitle) */}
      <Dialog
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
      >
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none shadow-2xl">
          {/* 这里添加 DialogTitle，用于增强可访问性，sr-only 样式表示仅屏幕阅读器可见 */}
          <DialogHeader className="sr-only">
            <DialogTitle>资源预览: {previewFile?.originalFilename}</DialogTitle>
            <DialogDescription>
              正在预览媒体文件详情，包括文件名称、ID 和大小。
            </DialogDescription>
          </DialogHeader>

          <div className="relative w-full aspect-video flex items-center justify-center group">
            {previewFile?.mediaType === "image" ? (
              <MediaImage
                file={previewFile}
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
                  onClick={() => handleDownload(previewFile as MediaFile)}
                  className="h-8 rounded-full border-primary/20 hover:bg-primary/10"
                >
                  Download Asset
                </Button>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center justify-between">
                <div className="text-white space-y-1">
                  <p className="text-sm font-bold italic">
                    {previewFile?.originalFilename}
                  </p>
                  <p className="text-[10px] font-mono opacity-60">
                    ID: {previewFile?.id} / Size:{" "}
                    {((previewFile?.fileSize || 0) / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownload(previewFile as MediaFile)}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/10 backdrop-blur-xl"
                >
                  <Download className="size-3.5 mr-2" /> Download Original
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 重命名对话框 - ✅ 修复 Accessibility 错误 (Add DialogTitle) */}
      <Dialog
        open={!!renameFile}
        onOpenChange={(open) => !open && setRenameFile(null)}
      >
        <DialogContent className="rounded-2xl border-none shadow-2xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold italic uppercase flex items-center gap-2 tracking-tight">
              <Edit2 className="size-5 text-primary" /> Modify Asset Key
            </DialogTitle>
            <DialogDescription className="sr-only">
              修改资源的原始文件名。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                Global Filename
              </Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-12 bg-muted/30 border-none rounded-xl font-bold italic"
              />
            </div>
          </div>
          <DialogFooter className="mt-8 pt-6 border-t gap-3 sm:justify-start">
            <Button
              onClick={handleRename}
              className="h-10 rounded-full font-bold uppercase tracking-widest px-8 shadow-lg shadow-primary/20"
            >
              Authorize Change
            </Button>
            <Button
              variant="ghost"
              onClick={() => setRenameFile(null)}
              className="h-10 rounded-full font-bold uppercase tracking-widest text-[10px]"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
