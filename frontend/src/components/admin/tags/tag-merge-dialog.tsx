"use client";

import React from "react";
import { type TagResponse } from "@/shared/api/generated";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface TagMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: TagResponse[];
  onConfirm: (sourceId: string, targetId: string) => void;
  isPending: boolean;
}

export function TagMergeDialog({
  open,
  onOpenChange,
  tags,
  onConfirm,
  isPending,
}: TagMergeDialogProps) {
  const [sourceId, setSourceId] = React.useState("");
  const [targetId, setTargetId] = React.useState("");

  // 重置状态
  React.useEffect(() => {
    if (!open) {
      setSourceId("");
      setTargetId("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>合并标签</DialogTitle>
          <DialogDescription>
            将“源标签”合并到“目标标签”。
            <br />
            <span className="text-destructive font-bold">
              源标签将被永久删除
            </span>
            ，其关联的所有文章将自动转移到目标标签。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground/70 tracking-tight">
              源标签 (Source)
            </Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="选择要删除的标签..." />
              </SelectTrigger>
              <SelectContent>
                {tags.map((t) => (
                  <SelectItem
                    key={t.id}
                    value={t.id}
                    disabled={t.id === targetId}
                  >
                    {t.name} ({t.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center py-1">
            <div className="h-px bg-border flex-1 self-center" />
            <span className="mx-4 text-[10px] font-mono text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded">
              Merge Into
            </span>
            <div className="h-px bg-border flex-1 self-center" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground/70 tracking-tight">
              目标标签 (Target)
            </Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger className="h-10 border-primary/20 bg-primary/5 focus:ring-primary/20">
                <SelectValue placeholder="选择保留的标签..." />
              </SelectTrigger>
              <SelectContent>
                {tags.map((t) => (
                  <SelectItem
                    key={t.id}
                    value={t.id}
                    disabled={t.id === sourceId}
                  >
                    {t.name} ({t.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            放弃操作
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(sourceId, targetId)}
            disabled={
              isPending || !sourceId || !targetId || sourceId === targetId
            }
            className="shadow-lg shadow-destructive/10"
          >
            {isPending ? "正在迁移关联并合并..." : "确认永久合并"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
