import { type MediaFileResponse } from "@/shared/api";
import { type ApiData } from "@/shared/api/transformers";

/**
 * 💡 架构升级提示：
 * 由于我们全面采用了“SDK+Blob”模式来加载资源，以彻底杜绝硬编码字符串，
 * 原本的 getMediaUrl 和 getThumbnailUrl 逻辑现已标记为过时。
 *
 * 外部 UI 组件请直接使用 useMediaBlob 钩子以获取正规来源的资源。
 */

/**
 * 如果某些场景依然需要展示原始路径名（非下载/渲染用途），可使用此函数。
 */
export function getAssetIdentity(
  file: ApiData<MediaFileResponse> | null
): string {
  if (!file) return "Unknown";
  return `${file.originalFilename} (${(file.fileSize / 1024).toFixed(1)} KB)`;
}
