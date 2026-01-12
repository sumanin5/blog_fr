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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Image as ImageIcon,
  Video,
  FileText,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useMediaFiles,
  getThumbnailUrl,
  type MediaFileResponse,
  type GetUserFilesData,
} from "@/hooks/use-media";

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
  onSelect: (file: MediaFileResponse) => void;

  /**
   * 过滤条件
   */
  filter?: {
    mediaType?: "image" | "video" | "document";
    usage?: "cover" | "avatar" | "general";
  };

  /**
   * 是否允许多选
   */
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
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // 构建查询参数
  const queryParams = useMemo(() => {
    const params: GetUserFilesData["query"] = {};

    if (filter?.mediaType) {
      params.media_type = filter.mediaType;
    }

    if (filter?.usage) {
      // @ts-ignore
      params.usage = filter.usage;
    }

    if (selectedType !== "all") {
      // @ts-ignore
      params.media_type = selectedType;
    }

    return params;
  }, [filter, selectedType]);

  // 获取媒体文件列表
  const { data, isLoading } = useMediaFiles(queryParams);

  // 过滤搜索结果
  const filteredFiles = useMemo(() => {
    if (!data?.files) return [];

    if (!searchQuery) return data.files;

    const query = searchQuery.toLowerCase();
    return data.files.filter(
      (file) =>
        file.original_filename.toLowerCase().includes(query) ||
        file.description?.toLowerCase().includes(query) ||
        file.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [data, searchQuery]);

  // 处理文件选择
  const handleSelectFile = (file: MediaFileResponse) => {
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

  // 确认多选
  const handleConfirmMultiple = () => {
    const selected = filteredFiles.filter((file) => selectedFiles.has(file.id));
    selected.forEach((file) => onSelect(file));
    onClose();
  };

  // 获取媒体类型图标
  const getMediaTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>媒体库</DialogTitle>
          <DialogDescription>
            选择已上传的文件{multiple && "（可多选）"}
          </DialogDescription>
        </DialogHeader>

        {/* 搜索和过滤 */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索文件名、描述或标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Tabs value={selectedType} onValueChange={setSelectedType}>
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="image">图片</TabsTrigger>
              <TabsTrigger value="video">视频</TabsTrigger>
              <TabsTrigger value="document">文档</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 文件网格 */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mb-4" />
              <p className="text-sm">
                {searchQuery ? "没有找到匹配的文件" : "还没有上传任何文件"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4 pb-4">
              {filteredFiles.map((file) => {
                const isSelected = selectedFiles.has(file.id);
                const thumbnailUrl =
                  file.media_type === "image"
                    ? getThumbnailUrl(file, "small")
                    : null;

                return (
                  <div
                    key={file.id}
                    className={cn(
                      "relative group cursor-pointer rounded-lg border-2 transition-all",
                      "hover:border-primary hover:shadow-md",
                      isSelected
                        ? "border-primary ring-2 ring-primary"
                        : "border-transparent"
                    )}
                    onClick={() => handleSelectFile(file)}
                  >
                    {/* 缩略图或占位符 */}
                    <div className="aspect-square bg-muted rounded-t-lg overflow-hidden">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={file.alt_text || file.original_filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {getMediaTypeIcon(file.media_type)}
                        </div>
                      )}
                    </div>

                    {/* 选中标记 */}
                    {multiple && isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    )}

                    {/* 文件信息 */}
                    <div className="p-2 space-y-1">
                      <p
                        className="text-xs font-medium truncate"
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* 底部操作栏 */}
        {multiple && selectedFiles.size > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              已选择 {selectedFiles.size} 个文件
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button onClick={handleConfirmMultiple}>确认选择</Button>
            </div>
          </div>
        )}

        {!multiple && (
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
