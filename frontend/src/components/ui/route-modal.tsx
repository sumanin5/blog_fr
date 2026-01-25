"use client";

import { useRouter } from "next/navigation";
import { useState, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RouteModalProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function RouteModal({
  children,
  title,
  className = "",
}: RouteModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // 延迟一点时间等 Dialog 的退场动画结束后再执行 URL 回退
      setTimeout(() => {
        router.back();
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`max-w-md border-none bg-transparent p-0 shadow-none sm:max-w-md ${className}`}
      >
        {/* 隐藏 Title 但保留它以符合无障碍 (Accessibility) 标准 */}
        <DialogHeader className="sr-only">
          <DialogTitle>{title || "Authentication"}</DialogTitle>
        </DialogHeader>

        {/* 这里包裹一层背景，因为 DialogContent 默认自带了一些样式，我们通过自定义来控制内容可见性 */}
        <div className="relative overflow-hidden rounded-2xl border bg-background p-8 shadow-2xl">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
