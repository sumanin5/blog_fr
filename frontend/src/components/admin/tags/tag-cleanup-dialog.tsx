"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TagCleanupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function TagCleanupDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: TagCleanupDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="shadow-2xl border-destructive/20">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            确认清理无效标签？
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed">
            此操作将彻底扫描数据库，<strong>永久删除</strong>
            所有尚未与任何文章关联的空标签。
            <br />
            <span className="mt-2 block font-medium text-foreground italic">
              提示：这通常用于清理无效的自动导入数据。
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-muted hover:bg-muted/80">
            暂不清理
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault(); // 阻止默认关闭，由 Hook 控制
              onConfirm();
            }}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/20"
            disabled={isPending}
          >
            {isPending ? "正在清理中..." : "确认永久删除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
