/**
 * 媒体文件工具函数
 */

export type ThumbnailSize = "small" | "medium" | "large" | "xlarge";

/**
 * 生成缩略图 URL
 * @param mediaId 媒体文件 ID
 * @param size 缩略图尺寸
 * @returns 缩略图 URL
 */
export function getThumbnailUrl(
  mediaId: string | null | undefined,
  size: ThumbnailSize = "medium",
): string | null {
  if (!mediaId) return null;
  return `/api/v1/media/${mediaId}/thumbnail/${size}`;
}

/**
 * 生成原图 URL
 * @param mediaId 媒体文件 ID
 * @returns 原图 URL
 */
export function getMediaUrl(mediaId: string | null | undefined): string | null {
  if (!mediaId) return null;
  return `/api/v1/media/${mediaId}/view`;
}

/**
 * 智能获取图片预览 URL
 * 如果是 SVG，返回原图 URL；否则返回缩略图 URL。
 * @param media 媒体文件对象 (包含 id 和 mime_type)
 * @param size 期望的缩略图尺寸
 */
export function getSafeImageUrl(
  media:
    | { id: string; mime_type?: string; mimeType?: string }
    | null
    | undefined,
  size: ThumbnailSize = "medium",
): string | null {
  if (!media || !media.id) return null;

  // 兼容 snake_case 和 camelCase (ApiData 转换后通常为 camelCase)
  const mimeType = media.mimeType || media.mime_type || "";

  if (mimeType.toLowerCase().includes("svg")) {
    return getMediaUrl(media.id);
  }

  return getThumbnailUrl(media.id, size);
}
