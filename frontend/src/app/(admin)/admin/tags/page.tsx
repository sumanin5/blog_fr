"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";

// Hooks
import { useAuth } from "@/hooks/use-auth";
import { useTagsAdmin } from "@/hooks/admin/use-tags-admin";

// Feature Components
import { TagToolbar } from "@/components/admin/tags/tag-toolbar";
import { TagTable } from "@/components/admin/tags/tag-table";
import { TagEditDialog } from "@/components/admin/tags/tag-edit-dialog";
import { TagMergeDialog } from "@/components/admin/tags/tag-merge-dialog";
import { TagCleanupDialog } from "@/components/admin/tags/tag-cleanup-dialog";

// Types
import { type TagResponse } from "@/shared/api/generated";

export default function TagsPage() {
  const { user } = useAuth();

  // 分页与搜索状态
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState("");

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    updateMutation,
    cleanupMutation,
    mergeMutation,
  } = useTagsAdmin(currentPage, 50, searchTerm);

  // Component States
  const [editingTag, setEditingTag] = React.useState<TagResponse | null>(null);
  const [dialogs, setDialogs] = React.useState({
    edit: false,
    merge: false,
    cleanup: false,
  });

  // Guard: Superadmin only
  if (user?.role !== "superadmin") {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive opacity-30" />
        <div className="space-y-1">
          <h2 className="text-xl font-bold italic tracking-tight uppercase">
            Access Denied
          </h2>
          <p className="text-sm text-muted-foreground font-mono">
            仅超级管理员可执行标签治理操作
          </p>
        </div>
      </div>
    );
  }

  // 这里的 items 已经是后端根据 searchTerm 过滤后的了
  const allTags = data?.items || [];

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-1 duration-1000">
      <div className="space-y-8 p-6">
        {/* 1. 工具栏 */}
        <TagToolbar
          totalCount={data?.total || 0}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onRefetch={refetch}
          isFetching={isFetching}
          onOpenCleanup={() => setDialogs((d) => ({ ...d, cleanup: true }))}
          onOpenMerge={() => setDialogs((d) => ({ ...d, merge: true }))}
        />

        {/* 2. 主列表表格 (传入分页数据) */}
        <TagTable
          tags={allTags}
          isLoading={isLoading}
          pageCount={data?.pages}
          pageIndex={(data?.page ?? 1) - 1}
          totalItems={data?.total}
          onPageChange={setCurrentPage}
          onEdit={(tag) => {
            setEditingTag(tag);
            setDialogs((d) => ({ ...d, edit: true }));
          }}
          onMergeRequest={() => setDialogs((d) => ({ ...d, merge: true }))}
        />

        {/* 3. 各种弹窗组件 */}
        <TagEditDialog
          open={dialogs.edit}
          onOpenChange={(open) => setDialogs((d) => ({ ...d, edit: open }))}
          tag={editingTag}
          isSaving={updateMutation.isPending}
          onSave={(data) =>
            editingTag &&
            updateMutation.mutate(
              { id: editingTag.id, payload: data },
              {
                onSuccess: () => {
                  setDialogs((d) => ({ ...d, edit: false }));
                },
              },
            )
          }
        />

        <TagMergeDialog
          open={dialogs.merge}
          onOpenChange={(open) => setDialogs((d) => ({ ...d, merge: open }))}
          tags={allTags}
          onConfirm={(sourceId, targetId) =>
            mergeMutation.mutate(
              { sourceTagId: sourceId, targetTagId: targetId },
              {
                onSuccess: () => {
                  setDialogs((d) => ({ ...d, merge: false }));
                },
              },
            )
          }
          isPending={mergeMutation.isPending}
        />

        <TagCleanupDialog
          open={dialogs.cleanup}
          onOpenChange={(open) => setDialogs((d) => ({ ...d, cleanup: open }))}
          isPending={cleanupMutation.isPending}
          onConfirm={() =>
            cleanupMutation.mutate(undefined, {
              onSuccess: () => {
                setDialogs((d) => ({ ...d, cleanup: false }));
              },
            })
          }
        />
      </div>
    </div>
  );
}
