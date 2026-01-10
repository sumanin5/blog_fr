"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { RegisterForm } from "@/components/auth/register-form";
import { useEffect, useState, useCallback } from "react";

export default function RegisterModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      router.back();
    }, 200);
  }, [router]);

  // 监听 ESC 键关闭
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* 弹窗主体 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border bg-background p-8 shadow-2xl"
          >
            {/* 关闭按钮 */}
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground absolute top-4 right-4 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <RegisterForm onSuccess={handleClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
