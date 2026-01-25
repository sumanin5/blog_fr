"use client";

import { useMediaStats } from "@/hooks/admin/use-media";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ImageIcon,
  Video,
  HardDrive,
  FileText,
  Globe,
  Lock,
} from "lucide-react";

export function MediaStats() {
  const { data, isLoading } = useMediaStats();

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  // ✅ 核心修复：现在使用 data.byType 等驼峰属性（由 ApiData 提供提示）
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* 存储总量 */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-0.5">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Storage Usage
            </CardTitle>
            <div className="text-2xl font-black italic tracking-tighter">
              {formatSize(data.totalSize)}
            </div>
          </div>
          <HardDrive className="h-4 w-4 text-primary opacity-50" />
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted h-1 rounded-full overflow-hidden mt-1">
            <div className="bg-primary h-full w-[45%]" />
          </div>
          <p className="text-[9px] mt-2 text-muted-foreground italic">
            System capacity healthy
          </p>
        </CardContent>
      </Card>

      {/* 文件总数 */}
      <Card className="border-none shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-0.5">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Total Assets
            </CardTitle>
            <div className="text-2xl font-black italic tracking-tighter">
              {data.totalFiles}
            </div>
          </div>
          <ImageIcon className="h-4 w-4 text-emerald-500 opacity-50" />
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            <Globe className="size-3" /> {data.publicFiles}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded">
            <Lock className="size-3" /> {data.privateFiles}
          </span>
        </CardContent>
      </Card>

      {/* 媒体类型预览 */}
      <Card className="border-none shadow-lg lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Inventory Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-6 h-12">
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between text-[9px] font-bold uppercase">
                <span>Items</span>
                <span>{data.byType.image || 0}</span>
              </div>
              <div
                className="bg-primary h-1.5 rounded-full"
                style={{
                  width: `${Math.min((data.byType.image || 0) * 10, 100)}%`,
                }}
              />
              <span className="text-[8px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                <ImageIcon className="size-2" /> IMAGES
              </span>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between text-[9px] font-bold uppercase">
                <span>Items</span>
                <span>{data.byType.video || 0}</span>
              </div>
              <div
                className="bg-orange-500 h-1.5 rounded-full w-[20%]"
                style={{
                  width: `${Math.min((data.byType.video || 0) * 20, 100)}%`,
                }}
              />
              <span className="text-[8px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                <Video className="size-2" /> VIDEOS
              </span>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between text-[9px] font-bold uppercase">
                <span>Items</span>
                <span>{data.byType.document || 0}</span>
              </div>
              <div
                className="bg-blue-500 h-1.5 rounded-full w-[15%]"
                style={{
                  width: `${Math.min((data.byType.document || 0) * 15, 100)}%`,
                }}
              />
              <span className="text-[8px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                <FileText className="size-2" /> DOCS
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
