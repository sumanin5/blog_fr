"use client";

import React from "react";
import Link from "next/link";
import { PostShortResponse } from "@/shared/api/generated/types.gen";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";

interface PostCardProps {
  post: PostShortResponse;
}

export function PostCard({ post }: PostCardProps) {
  // 保持一致的日期格式化，防止水合错误
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  };

  const authorName = post.author?.full_name || post.author?.username || "Admin";

  return (
    <Link href={`/posts/${post.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/10 border-black/5 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] group-hover:bg-white/80 dark:group-hover:bg-white/10">
        {/* 封面图区域 - 紧凑比例 */}
        <div className="relative aspect-video w-full overflow-hidden bg-muted/30">
          <div className="flex h-full items-center justify-center text-muted-foreground/20 group-hover:scale-105 transition-transform duration-700 font-mono font-bold text-xl">
            {post.cover_media_id ? "COVER" : "BLOG_FR"}
          </div>

          {/* 叠加层：分类/主标签 - 借鉴 Figma 设计 */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-6">
            <div className="flex flex-wrap gap-2">
              {(post.category?.name || (post.tags && post.tags[0]?.name)) && (
                <Badge
                  variant="secondary"
                  className="rounded-sm bg-primary/20 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground border-none"
                >
                  {post.category?.name || post.tags![0].name}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* 内容区域 - 移除冗余 Padding */}
        <div className="flex flex-1 flex-col p-5 space-y-3">
          <CardTitle className="line-clamp-2 text-lg font-bold leading-tight text-foreground transition-colors group-hover:text-primary tracking-tight">
            {post.title}
          </CardTitle>

          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground transition-colors group-hover:text-foreground/80">
            {post.excerpt}
          </p>

          {/* 底部信息：整合为单行 Monospaced 风格 */}
          <div className="mt-auto pt-4 flex items-center justify-between text-[10px] font-mono font-medium uppercase tracking-tighter text-muted-foreground/70">
            <div className="flex items-center gap-3">
              <span className="text-primary/80 lowercase">
                @{authorName.replace(/\s+/g, "_")}
              </span>
              <div className="flex items-center gap-1 opacity-60">
                <Calendar className="h-2.5 w-2.5" />
                <span>{formatDate(post.created_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-60">
              <Clock className="h-2.5 w-2.5" />
              <span>{post.reading_time} MIN</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
