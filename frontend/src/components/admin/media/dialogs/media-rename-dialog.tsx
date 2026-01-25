"use client";

import { useEffect, useState } from "react";
import { type MediaFile } from "@/shared/api/types";
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
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { toast } from "sonner";

interface MediaRenameDialogProps {
  file: MediaFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (id: string, name: string) => Promise<void>;
}

export function MediaRenameDialog({
  file,
  open,
  onOpenChange,
  onRename,
}: MediaRenameDialogProps) {
  const [newName, setNewName] = useState("");

  // 当 file 变化时，重置输入框
  useEffect(() => {
    if (file) {
      setNewName(file.originalFilename);
    }
  }, [file]);

  const handleConfirm = async () => {
    if (!file || !newName.trim()) return;
    try {
      await toast.promise(onRename(file.id, newName), {
        loading: "正在重命名...",
        success: "重命名成功",
        error: "重命名失败",
      });
      onOpenChange(false);
    } catch {
      // Error handled by toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
            />
          </div>
        </div>
        <DialogFooter className="mt-8 pt-6 border-t gap-3 sm:justify-start">
          <Button
            onClick={handleConfirm}
            className="h-10 rounded-full font-bold uppercase tracking-widest px-8 shadow-lg shadow-primary/20"
          >
            Authorize Change
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-full font-bold uppercase tracking-widest text-[10px]"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
