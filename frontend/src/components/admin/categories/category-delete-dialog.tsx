"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert } from "lucide-react";
import { AdminActionButton } from "@/components/admin/common/admin-action-button";

interface CategoryDeleteDialogProps {
  id: string | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
  isPending: boolean;
}

export function CategoryDeleteDialog({
  id,
  onClose,
  onConfirm,
  isPending,
}: CategoryDeleteDialogProps) {
  return (
    <AlertDialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-5" />
            确认删除此分类吗？
          </AlertDialogTitle>
          <AlertDialogDescription>
            此操作只删除数据库中的分类记录，不会删除 Git 目录或 index.md。
            <br />
            如果该分类下仍有关联文章，删除操作将会失败；全量同步可能重新导入
            Git 中的分类。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>取消</AlertDialogCancel>
          <AdminActionButton
            variant="destructive"
            onClick={() => id && onConfirm(id)}
            isLoading={isPending}
            loadingText="删除中"
          >
            确认删除
          </AdminActionButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
