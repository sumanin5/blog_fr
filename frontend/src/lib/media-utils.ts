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
