"use client";

import { useState } from "react";
import {
  useMediaFiles,
  useDeleteFile,
  useUpdateFile,
  type MediaFileResponse,
  type GetUserFilesData,
} from "@/hooks/use-media";
import { downloadFile } from "@/shared/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  MoreVertical,
  Download,
  Trash2,
  Edit2,
  Eye,
  Image as ImageIcon,
  FileText,
  Loader2,
} from "lucide-react";
import { MediaImage } from "./media-image";
// import { RenameDialog } from "./rename-dialog"; // Integrated into component
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MediaGridProps {
  viewMode: "grid" | "list";
  selectedFiles: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  filter?: {
    media_type?: "image" | "video" | "document";
    usage?: string;
  };
  searchQuery?: string;
}

export function MediaGrid({
  viewMode,
  selectedFiles,
  onSelectionChange,
  filter,
  searchQuery,
}: MediaGridProps) {
  const { data, isLoading } = useMediaFiles({
    ...filter,
    q: searchQuery,
  } as GetUserFilesData["query"]);
  const deleteMutation = useDeleteFile();
  const updateMutation = useUpdateFile();

  const [previewFile, setPreviewFile] = useState<MediaFileResponse | null>(
    null
  );
  const [renameFile, setRenameFile] = useState<MediaFileResponse | null>(null);
  const [newName, setNewName] = useState("");

  const handleRename = async () => {
    if (!renameFile || !newName.trim()) return;

    try {
      await updateMutation.mutateAsync({
        fileId: renameFile.id,
        data: { original_filename: newName },
      });
      toast.success("重命名成功", {
        description: `文件已重命名为 ${newName}`,
      });
      setRenameFile(null);
    } catch (err) {
      toast.error("重命名失败", {
        description: err instanceof Error ? err.message : "请重试",
      });
    }
  };

  // 切换选中状态
  const toggleSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    onSelectionChange(newSelected);
  };

  // 删除文件
  const handleDelete = async (file: MediaFileResponse) => {
    if (!confirm(`确定要删除文件 "${file.original_filename}" 吗？`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(file.id);
      toast.success("删除成功", {
        description: `已删除文件 ${file.original_filename}`,
      });
    } catch (error) {
      toast.error("删除失败", {
        description: error instanceof Error ? error.message : "请重试",
      });
    }
  };

  // 下载文件
  const handleDownload = async (file: MediaFileResponse) => {
    try {
      const response = await downloadFile({
        path: { file_id: file.id },
        parseAs: "blob",
        throwOnError: true,
      });

      if (response.data) {
        const url = window.URL.createObjectURL(
          response.data as unknown as Blob
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = file.original_filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch {
      toast.error("下载失败", {
        description: "无法下载文件，请稍后重试",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.files || data.files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-4" />
        {searchQuery ? (
          <>
            <p className="text-sm font-medium">没有找到匹配的文件</p>
            <p className="text-xs mt-1">
              搜索词 &quot;{searchQuery}&quot; 没有匹配到任何文件名或描述
            </p>
          </>
        ) : (
          <p className="text-sm">还没有上传任何文件</p>
        )}
      </div>
    );
  }

  return (
    <>
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {data.files.map((file) => {
            const isSelected = selectedFiles.has(file.id);

            return (
              <div
                key={file.id}
                className={cn(
                  "group relative rounded-lg border-2 transition-all cursor-pointer",
                  "hover:border-primary hover:shadow-md",
                  isSelected && "border-primary ring-2 ring-primary"
                )}
              >
                {/* 选择框 */}
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(file.id)}
                    className="bg-background"
                  />
                </div>

                {/* 操作菜单 */}
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPreviewFile(file)}>
                        <Eye className="h-4 w-4 mr-2" />
                        预览
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setRenameFile(file);
                          setNewName(file.original_filename);
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        重命名
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(file)}>
                        <Download className="h-4 w-4 mr-2" />
                        下载
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(file)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* 缩略图 */}
                <div
                  className="aspect-square bg-muted rounded-t-lg overflow-hidden"
                  onClick={() => setPreviewFile(file)}
                >
                  <MediaImage
                    file={file}
                    size="small"
                    className="w-full h-full"
                    fallbackClassName="w-full h-full"
                  />
                </div>

                {/* 文件信息 */}
                <div className="p-3 space-y-2">
                  <p
                    className="text-sm font-medium truncate"
                    title={file.original_filename}
                  >
                    {file.original_filename}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {file.media_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {(file.file_size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  {file.width && file.height && (
                    <p className="text-xs text-muted-foreground">
                      {file.width} × {file.height}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // 列表视图
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      data.files.length > 0 &&
                      selectedFiles.size === data.files.length
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onSelectionChange(new Set(data.files.map((f) => f.id)));
                      } else {
                        onSelectionChange(new Set());
                      }
                    }}
                  />
                </TableHead>
                <TableHead>文件</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>大小</TableHead>
                <TableHead>尺寸</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.files.map((file) => {
                const isSelected = selectedFiles.has(file.id);

                return (
                  <TableRow
                    key={file.id}
                    data-state={isSelected ? "selected" : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(file.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
                          <MediaImage
                            file={file}
                            size="small"
                            className="h-full w-full"
                          />
                        </div>
                        <span
                          className="font-medium truncate max-w-50"
                          title={file.original_filename}
                        >
                          {file.original_filename}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{file.media_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {(file.file_size / 1024).toFixed(1)} KB
                    </TableCell>
                    <TableCell>
                      {file.width ? `${file.width} × ${file.height}` : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setPreviewFile(file)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            预览
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setRenameFile(file);
                              setNewName(file.original_filename);
                            }}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            重命名
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDownload(file)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            下载
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(file)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 预览弹窗 */}
      <Dialog
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
      >
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-transparent border-none shadow-none text-white ring-0 outline-none">
          <DialogTitle className="sr-only">文件预览</DialogTitle>
          <DialogDescription className="sr-only">
            预览媒体文件: {previewFile?.original_filename}
          </DialogDescription>
          <div
            className="relative w-full h-[80vh] flex items-center justify-center"
            onClick={() => setPreviewFile(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-full max-h-full"
            >
              {previewFile?.media_type === "image" ? (
                <div className="flex flex-col items-center gap-4">
                  <MediaImage
                    file={previewFile}
                    size="large"
                    className="max-w-full max-h-[70vh] object-contain rounded-md shadow-2xl"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => previewFile && handleDownload(previewFile)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    查看原图 ({((previewFile.file_size || 0) / 1024).toFixed(
                      1
                    )}{" "}
                    KB)
                  </Button>
                </div>
              ) : previewFile?.media_type === "video" ? (
                <video
                  src={
                    previewFile ? `/api/v1/media/${previewFile.id}/view` : ""
                  }
                  controls
                  className="max-w-full max-h-full rounded-md bg-black shadow-2xl"
                />
              ) : (
                <div className="bg-background text-foreground p-8 rounded-lg text-center shadow-lg min-w-75">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-primary" />
                  <p className="text-lg font-medium mb-2">
                    {previewFile?.original_filename}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    无法预览此文件类型
                  </p>
                  <Button
                    onClick={() => previewFile && handleDownload(previewFile)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    下载查看
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 重命名对话框 */}
      <Dialog
        open={!!renameFile}
        onOpenChange={(open) => !open && setRenameFile(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名文件</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                名称
              </Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFile(null)}>
              取消
            </Button>
            <Button onClick={handleRename}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
