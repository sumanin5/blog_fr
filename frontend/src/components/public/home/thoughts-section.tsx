"use client";

import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import type { PostShortResponse } from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";
import { routes } from "@/lib/routes";
import { motion } from "framer-motion";

interface ThoughtsProps {
  posts: ApiData<PostShortResponse>[];
}

export function ThoughtsSection({ posts }: ThoughtsProps) {
  const items = posts || [];

  const formatDate = (dateString?: string) => {
    if (!dateString) return "2026-09-26";
    const d = new Date(dateString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <section className="space-y-6">
      {/* 头部标题与查看全部 */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            最新想法
          </h2>
        </div>
        <Link
          href="/posts/ideas"
          className="group inline-flex items-center text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors"
        >
          <span>查看全部</span>
          <ArrowRight className="ml-1 w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* 想法单篇列表流 (绿点指示 + 单篇核心思考) */}
      <div className="space-y-4">
        {items.map((post, index) => {
          const linkHref = routes.postDetailSlug("ideas", post.slug || post.id);

          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
            >
              <Link
                href={linkHref}
                className="group block p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/30 hover:bg-muted/40"
              >
                <div className="space-y-2">
                  {/* 标题带绿点 */}
                  <div className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0 group-hover:scale-125 transition-transform" />
                    <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                      {post.title}
                    </h3>
                  </div>

                  {/* 核心随笔摘录 */}
                  <p className="pl-4 text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 font-light">
                    {post.excerpt}
                  </p>

                  {/* 发布日期 */}
                  <div className="pl-4 pt-1 text-[11px] font-mono text-muted-foreground/60">
                    {formatDate(post.publishedAt || post.createdAt)}
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
