import { useState } from "react";
import { type MediaFile } from "@/shared/api";
import { Image as ImageIcon, Loader2 } from "lucide-react";
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

import { MediaPreviewDialog } from "../dialogs/media-preview-dialog";
import { MediaRenameDialog } from "../dialogs/media-rename-dialog";
import { useMediaDownload } from "@/hooks/admin/media/use-media-download";

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

  const handleDownload = useMediaDownload();

  const toggleSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) newSelected.delete(fileId);
    else newSelected.add(fileId);
    onSelectionChange(newSelected);
  };

  const handleDelete = async (file: MediaFile) => {
    if (!confirm(`确定要删除 "${file.originalFilename}" 吗？`)) return;
    try {
      await toast.promise(onDelete?.(file.id) as Promise<void>, {
        loading: "正在删除文件...",
        success: "文件已成功移除",
        error: "删除失败",
      });
    } catch {}
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
              onRename={setRenameFile}
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
              onRename: setRenameFile,
              onDelete: handleDelete,
              onRegenerate,
            })}
            selectedRows={selectedFiles}
            onSelectionChange={onSelectionChange}
            isLoading={isLoading}
            pageCount={-1} // 禁用 Table 内置分页，使用统一分页
            pageIndex={(data?.page ?? 1) - 1} // 仅用于高亮（如果有的话），其实 Table 如果不处理分页这行没用
            totalItems={data?.total}
          />
        </div>
      )}

      {/* 统一分页组件: Grid 和 List 共享 */}
      {data && data.pages > 1 && (
        <AdminPagination
          page={data.page}
          pages={data.pages}
          total={data.total}
          onPageChange={(page) => onPageChange?.(page)}
        />
      )}

      <MediaPreviewDialog
        file={previewFile}
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
      />

      <MediaRenameDialog
        file={renameFile}
        open={!!renameFile}
        onOpenChange={(open) => !open && setRenameFile(null)}
        onRename={onRename!}
      />
    </div>
  );
}
