"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MediaGrid,
  MediaUploader,
  MediaStats,
  MediaToolbar,
} from "./components";
import { useBatchDeleteFiles } from "@/hooks/use-media";
import { toast } from "sonner";

export default function MediaManagementPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const batchDeleteMutation = useBatchDeleteFiles();

  // 批量删除处理
  const handleBatchDelete = useCallback(async () => {
    if (selectedFiles.size === 0) return;

    const confirmed = confirm(
      `确定要删除选中的 ${selectedFiles.size} 个文件吗？此操作不可恢复。`
    );
    if (!confirmed) return;

    try {
      const result = await batchDeleteMutation.mutateAsync(
        Array.from(selectedFiles)
      );
      toast.success("批量删除成功", {
        description: `已删除 ${
          result?.deleted_count ?? selectedFiles.size
        } 个文件`,
      });
      setSelectedFiles(new Set());
    } catch (error) {
      toast.error("批量删除失败", {
        description: error instanceof Error ? error.message : "请重试",
      });
    }
  }, [selectedFiles, batchDeleteMutation]);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">媒体管理</h1>
          <p className="text-muted-foreground">
            管理所有上传的图片、视频和文档文件
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <MediaStats />

      {/* 主要内容区域 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>文件库</CardTitle>
              <CardDescription>浏览和管理所有媒体文件</CardDescription>
            </div>
            <MediaUploader />
          </div>
        </CardHeader>
        <CardContent>
          {/* 工具栏 */}
          <MediaToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedCount={selectedFiles.size}
            onClearSelection={() => setSelectedFiles(new Set())}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onBatchDelete={handleBatchDelete}
            isBatchDeleting={batchDeleteMutation.isPending}
          />

          {/* 文件类型标签页 */}
          <Tabs defaultValue="all" className="mt-4">
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="image">图片</TabsTrigger>
              <TabsTrigger value="video">视频</TabsTrigger>
              <TabsTrigger value="document">文档</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <MediaGrid
                viewMode={viewMode}
                selectedFiles={selectedFiles}
                onSelectionChange={setSelectedFiles}
                searchQuery={searchQuery}
              />
            </TabsContent>

            <TabsContent value="image" className="mt-6">
              <MediaGrid
                viewMode={viewMode}
                selectedFiles={selectedFiles}
                onSelectionChange={setSelectedFiles}
                filter={{ media_type: "image" }}
                searchQuery={searchQuery}
              />
            </TabsContent>

            <TabsContent value="video" className="mt-6">
              <MediaGrid
                viewMode={viewMode}
                selectedFiles={selectedFiles}
                onSelectionChange={setSelectedFiles}
                filter={{ media_type: "video" }}
                searchQuery={searchQuery}
              />
            </TabsContent>

            <TabsContent value="document" className="mt-6">
              <MediaGrid
                viewMode={viewMode}
                selectedFiles={selectedFiles}
                onSelectionChange={setSelectedFiles}
                filter={{ media_type: "document" }}
                searchQuery={searchQuery}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
