"use client";

import { useMediaBlob } from "@/hooks/admin/use-media";
import { cn } from "@/lib/utils";
import { ImageOff, Loader2 } from "lucide-react";
import { type ApiData } from "@/shared/api/transformers";
import { type MediaFileResponse } from "@/shared/api";
import { useMediaStore } from "@/stores/use-media-store";
import { useEffect } from "react";

interface MediaImageProps {
  file: ApiData<MediaFileResponse> | null;
  size?: "small" | "medium" | "large";
  className?: string;
  fallbackClassName?: string;
}

/**
 * 盾牌级图片渲染组件
 * 核心逻辑：不猜路径，不拼 URL。直接问 SDK 要 Blob。
 * 升级：使用 Zustand 全局存储管理 URL，防止竞态销毁。
 */
export function MediaImage({
  file,
  size = "medium",
  className,
  fallbackClassName,
}: MediaImageProps) {
  // 1. 直接“拿”数据。SDK 会处理好一切地址、前缀、鉴权信息。
  const { data: blob, isLoading, isError } = useMediaBlob(file, size);

  // 2. Zustand 仓库：获取全局动作和状态
  const acquireUrl = useMediaStore((s) => s.acquireUrl);
  const releaseUrl = useMediaStore((s) => s.releaseUrl);

  // 3. 直接从 Store 中读取 URL，而不是存本地 State
  // 只有当 file 存在且 Blob 就位时，我们才尝试去 store 查找
  const objectUrl = useMediaStore((s) =>
    file ? s.registry[`${file.id}:${size}`]?.url : null
  );

  // 4. 注册/注销逻辑：只有当 Blob 真正就位时才执行
  useEffect(() => {
    if (!file || !blob) return;

    // 申请资源：如果别人已经申请过，会直接复用那个 URL
    // 注意：这里不需要 setState 了，因为 Zustand 内部状态更新会触发上面的 selector 重新计算
    acquireUrl(file.id, size, blob);

    // 清理资源：组件卸载时，或者 blob 变更时，归还资源
    return () => {
      releaseUrl(file.id, size);
    };
  }, [file?.id, size, blob, acquireUrl, releaseUrl]);

  if (!file || file.mediaType !== "image") {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          fallbackClassName
        )}
      >
        <ImageOff className="h-6 w-6 opacity-20" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted animate-pulse",
          className
        )}
      >
        <Loader2 className="size-4 animate-spin opacity-20" />
      </div>
    );
  }

  // 修改：如果 Store 还没准备好 URL（可能在 useEffect 执行前的微小间隙），视作 Loading 而非 Error
  // 只有当 isError 为真，或者 blob 已经有了但 URL 还是空的（极罕见），才显示错误
  if (isError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          fallbackClassName
        )}
      >
        <ImageOff className="h-6 w-6 opacity-20" />
      </div>
    );
  }

  // 如果 blob 好了但 URL 还没生成（Layout Effect Gap），暂时显示 Loading
  if (blob && !objectUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted animate-pulse",
          className
        )}
      >
        <div className="size-full bg-muted/50" />
      </div>
    );
  }

  return (
    <img
      src={objectUrl || ""}
      alt={file.altText || file.originalFilename}
      className={cn("bg-muted", className)}
      loading="lazy"
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
