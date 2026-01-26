"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MediaGrid,
  MediaUploader,
  MediaStats,
  MediaToolbar,
} from "@/components/admin/media";
import { useMediaAdmin } from "@/hooks/admin/use-media-admin";
import { type MediaType } from "@/shared/api";
import { AdminActionButton } from "@/components/admin/common/admin-action-button";
import { RefreshCw } from "lucide-react";

export default function MediaManagementPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // 👑 核心逻辑收拢：统一在 Page 层调度 Hook，像维护标签一样维护媒体
  const {
    data,
    isLoading,
    refetch,
    updateMutation,
    deleteMutation,
    batchDeleteMutation,
    regenerateMutation,
  } = useMediaAdmin({
    q: searchQuery,
    mediaType: activeType === "all" ? undefined : (activeType as MediaType),
    page: currentPage,
    size: 50,
  });

  // 批量删除处理
  const handleBatchDelete = useCallback(async () => {
    if (selectedFiles.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedFiles.size} 个文件吗？`)) return;

    await batchDeleteMutation.mutateAsync(
      { fileIds: Array.from(selectedFiles) },
      {
        onSuccess: () => setSelectedFiles(new Set()),
      },
    );
  }, [selectedFiles, batchDeleteMutation]);

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-1 duration-1000">
      <div className="space-y-8 p-6">
        {/* 1. 页面标题与同步动作 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight italic text-primary/90 uppercase">
              媒体库管理
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest opacity-60">
              Digital Assets / Global Media Inventory
            </p>
          </div>
          <div className="flex items-center gap-3">
            <MediaUploader />
          </div>
        </div>

        {/* 2. 统计概览 */}
        <MediaStats />

        {/* 3. 主体内容区 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-muted-foreground/10">
            <div>
              <h2 className="text-lg font-bold tracking-tight">资源探索</h2>
              <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-tighter">
                Browse and control your uploaded assets
              </p>
            </div>
            <AdminActionButton
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              className="text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100"
              onClick={() => refetch()}
              isLoading={isLoading}
            >
              同步云端
            </AdminActionButton>
          </div>

          <MediaToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedCount={selectedFiles.size}
            onClearSelection={() => setSelectedFiles(new Set())}
            searchQuery={searchQuery}
            onSearchChange={(val) => {
              setSearchQuery(val);
              setCurrentPage(1);
            }}
            onBatchDelete={handleBatchDelete}
            isBatchDeleting={batchDeleteMutation.isPending}
          />

          <Tabs
            value={activeType}
            onValueChange={(val) => {
              setActiveType(val);
              setCurrentPage(1);
            }}
            className="mt-4"
          >
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger
                value="all"
                className="rounded-lg px-6 uppercase text-[10px] font-bold tracking-widest"
              >
                全部
              </TabsTrigger>
              <TabsTrigger
                value="image"
                className="rounded-lg px-6 uppercase text-[10px] font-bold tracking-widest"
              >
                图片
              </TabsTrigger>
              <TabsTrigger
                value="video"
                className="rounded-lg px-6 uppercase text-[10px] font-bold tracking-widest"
              >
                视频
              </TabsTrigger>
              <TabsTrigger
                value="document"
                className="rounded-lg px-6 uppercase text-[10px] font-bold tracking-widest"
              >
                文档
              </TabsTrigger>
            </TabsList>

            <div className="mt-6 min-h-[400px]">
              <MediaGrid
                data={data}
                isLoading={isLoading}
                viewMode={viewMode}
                selectedFiles={selectedFiles}
                onSelectionChange={setSelectedFiles}
                onPageChange={setCurrentPage}
                // 业务动作向下注入
                onDelete={async (id) => {
                  await deleteMutation.mutateAsync(id);
                }}
                onRename={async (id, name) => {
                  await updateMutation.mutateAsync({
                    id,
                    payload: { originalFilename: name },
                  });
                }}
                onRegenerate={async (id) => {
                  await regenerateMutation.mutateAsync(id);
                }}
              />
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
