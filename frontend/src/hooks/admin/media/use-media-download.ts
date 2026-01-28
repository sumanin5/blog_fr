"use client";

import { downloadFile, type MediaFile } from "@/shared/api";
import { toast } from "sonner";
import { useCallback } from "react";

/**
 * 📥 全局下载 Hook
 * 统一处理文件下载逻辑 (Blob 获取 -> a 标签触发 -> 资源回收)
 */
export function useMediaDownload() {
  const handleDownload = useCallback(async (file: MediaFile) => {
    try {
      const response = await downloadFile({
        path: { file_id: file.id },
        parseAs: "blob",
        throwOnError: true,
      });

      if (response.data) {
        const url = window.URL.createObjectURL(response.data as Blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.originalFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success(`正在下载: ${file.originalFilename}`);
      }
    } catch {
      toast.error("下载失败", { description: "无法获取文件流" });
    }
  }, []);

  return handleDownload;
}
