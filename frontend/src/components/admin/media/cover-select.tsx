"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";
import { CoverUpload } from "./cover-upload";
import { MediaLibraryDialog } from "./media-library-dialog";
import type { MediaFileResponse } from "@/hooks/use-media";

interface CoverSelectProps {
  /**
   * 当前封面文件信息
   */
  currentCover?: MediaFileResponse | null;

  /**
   * 封面变更回调
   */
  onCoverChange: (file: MediaFileResponse | null) => void;

  /**
   * 是否禁用
   */
  disabled?: boolean;

  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 封面选择组件 - 组合上传和从媒体库选择
 */
export function CoverSelect({
  currentCover,
  onCoverChange,
  disabled = false,
  className,
}: CoverSelectProps) {
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  return (
    <div className={className}>
      {/* 上传组件 */}
      <CoverUpload
        currentCover={currentCover}
        onCoverChange={onCoverChange}
        disabled={disabled}
      />

      {/* 从媒体库选择按钮 */}
      <div className="mt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMediaLibrary(true)}
          disabled={disabled}
          className="w-full"
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          从媒体库选择
        </Button>
      </div>

      {/* 媒体库弹窗 */}
      <MediaLibraryDialog
        open={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={(file) => {
          onCoverChange(file);
          setShowMediaLibrary(false);
        }}
        filter={{
          mediaType: "image",
          usage: "cover",
        }}
      />
    </div>
  );
}
