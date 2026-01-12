"use client";

import { useMediaFiles } from "@/hooks/use-media";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, Video, HardDrive } from "lucide-react";

export function MediaStats() {
  const { data } = useMediaFiles();

  const stats = data?.files
    ? {
        total: data.files.length,
        images: data.files.filter((f) => f.media_type === "image").length,
        videos: data.files.filter((f) => f.media_type === "video").length,
        documents: data.files.filter((f) => f.media_type === "document").length,
        totalSize: data.files.reduce((sum, f) => sum + f.file_size, 0),
      }
    : { total: 0, images: 0, videos: 0, documents: 0, totalSize: 0 };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">总文件数</CardTitle>
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            图片 {stats.images} · 视频 {stats.videos} · 文档 {stats.documents}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">图片文件</CardTitle>
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.images}</div>
          <p className="text-xs text-muted-foreground">
            {((stats.images / (stats.total || 1)) * 100).toFixed(0)}% 占比
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">视频文件</CardTitle>
          <Video className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.videos}</div>
          <p className="text-xs text-muted-foreground">
            {((stats.videos / (stats.total || 1)) * 100).toFixed(0)}% 占比
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">总存储空间</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatSize(stats.totalSize)}
          </div>
          <p className="text-xs text-muted-foreground">
            平均 {formatSize(stats.totalSize / (stats.total || 1))} / 文件
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
