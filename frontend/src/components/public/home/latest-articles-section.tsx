"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PostShortResponse } from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";
import { routes } from "@/lib/routes";
import { motion } from "framer-motion";

interface LatestArticlesProps {
  articles: ApiData<PostShortResponse>[];
}

export function LatestArticlesSection({ articles }: LatestArticlesProps) {
  const items = articles || [];

  const formatDate = (dateString?: string) => {
    if (!dateString) return "2026-09-28";
    const d = new Date(dateString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <section className="space-y-6">
      {/* 头部标题与查看全部 */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            最新文章
          </h2>
        </div>
        <Link
          href="/posts/articles"
          className="group inline-flex items-center text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors"
        >
          <span>查看全部文章</span>
          <ArrowRight className="ml-1 w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* 文章列表流 (左图右文横向卡片) */}
      <div className="space-y-6">
        {items.map((post, index) => {
          const linkHref = routes.postDetailSlug("articles", post.slug || post.id);
          // 缩略图：优先使用真实后端封面，若无则使用高分辨率艺术生成封面
          const thumbSrc =
            post.coverMediaId
              ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/media/${post.coverMediaId}/thumbnail/medium`
              : index % 2 === 0
                ? "/images/article-1.jpg"
                : "/images/article-2.jpg";

          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Link
                href={linkHref}
                className="group flex flex-col sm:flex-row gap-5 p-4 -mx-4 rounded-2xl transition-all duration-300 hover:bg-muted/40"
              >
                {/* 缩略图 */}
                <div className="relative w-full sm:w-48 md:w-56 aspect-[16/10] shrink-0 rounded-xl overflow-hidden bg-muted border border-border/40 shadow-xs">
                  <Image
                    src={thumbSrc}
                    alt={post.title}
                    fill
                    unoptimized
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* 文字内容 */}
                <div className="flex flex-col justify-between flex-1 py-0.5 space-y-2.5">
                  <div className="space-y-2">
                    {/* 标签 */}
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags && post.tags.length > 0 ? (
                        post.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className="text-[11px] px-2.5 py-0.5 font-normal bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20"
                          >
                            {tag.name}
                          </Badge>
                        ))
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[11px] px-2 py-0 font-normal bg-muted text-muted-foreground border-none"
                        >
                          系统设计
                        </Badge>
                      )}
                    </div>

                    {/* 标题 */}
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {post.title}
                    </h3>

                    {/* 摘要 */}
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 font-light">
                      {post.excerpt}
                    </p>
                  </div>

                  {/* 底部元信息 */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/80 font-mono pt-1">
                    <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readingTime || 10} 分钟阅读
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
