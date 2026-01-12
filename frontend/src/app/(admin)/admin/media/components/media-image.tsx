"use client";

import { useMemo } from "react";
import { useMediaBlob, type MediaFileResponse } from "@/hooks/use-media";
import { cn } from "@/lib/utils";
import { Loader2, ImageOff, FileText, Video as VideoIcon } from "lucide-react";

interface MediaImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  file: MediaFileResponse;
  size?: "small" | "medium" | "large"; // 对应缩略图尺寸
  fallbackClassName?: string;
}

export function MediaImage({
  file,
  size = "medium",
  className,
  fallbackClassName,
  alt,
  ...props
}: MediaImageProps) {
  const { data: blob, isLoading, isError } = useMediaBlob(file, size);

  // 使用 useMemo 替代 useEffect+useState 避免级联渲染
  const objectUrl = useMemo(() => {
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }, [blob]);

  // 清理 URL 需要在组件卸载时进行
  useMemo(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center animate-pulse",
          className,
          fallbackClassName
        )}
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !objectUrl) {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center",
          className,
          fallbackClassName
        )}
      >
        {file.media_type === "video" ? (
          <VideoIcon className="h-6 w-6 text-muted-foreground" />
        ) : file.media_type === "document" ? (
          <FileText className="h-6 w-6 text-muted-foreground" />
        ) : (
          <ImageOff className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={objectUrl}
      alt={alt || file.alt_text || file.original_filename}
      className={cn("object-cover", className)}
      {...props}
    />
  );
}
