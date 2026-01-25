"use client";

import { useState } from "react";
import { CoverUpload } from "./cover-upload";
import { MediaLibraryDialog } from "../dialogs/media-library-dialog";
import type { MediaFile } from "@/shared/api/types";

interface CoverSelectProps {
  /**
   * 当前封面文件信息
   */
  currentCover?: MediaFile | null;

  /**
   * 封面变更回调
   */
  onCoverChange: (file: MediaFile | null) => void;

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
      {/* 上传组件 (集成媒体库触发器) */}
      <CoverUpload
        currentCover={currentCover}
        onCoverChange={onCoverChange}
        disabled={disabled}
        onOpenLibrary={() => setShowMediaLibrary(true)}
      />

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
