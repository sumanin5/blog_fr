"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  Copy,
  Check,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PostShortResponse } from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";
import type { IdeaDomain } from "@/config/home-mock-data";
import Link from "next/link";
import { routes } from "@/lib/routes";

interface IdeaStreamViewProps {
  initialIdeas: ApiData<PostShortResponse>[];
  domains: IdeaDomain[];
  totalCount: number;
}

export function IdeaStreamView({
  initialIdeas,
  domains,
  totalCount,
}: IdeaStreamViewProps) {
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // 1. 根据当前选中的领域分类动态过滤想法
  const filteredIdeas = useMemo(() => {
    if (selectedDomain === "all") return initialIdeas;
    return initialIdeas.filter(
      (item) =>
        item.category?.slug === selectedDomain ||
        item.category?.id === selectedDomain,
    );
  }, [initialIdeas, selectedDomain]);

  // 2. 复制想法正文
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 3. 展开/折叠长文本
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 4. 友好时间格式化
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "刚刚";
    try {
      const date = new Date(dateStr);
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative min-h-screen">
      <main className="relative z-10 container mx-auto px-4 md:px-6 pt-24 pb-32 max-w-4xl">
        {/* 顶部标题与说明 */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium mb-4 backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Digital Garden · Memos & Streams</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground mb-4"
          >
            灵感流 ·{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-500 via-teal-400 to-cyan-500">
              思维碎片
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-sm sm:text-base leading-relaxed"
          >
            以领域为维度的即时思考、技术随笔与探索速记。
            <br className="hidden sm:inline" />
            无需进入二级内页，单篇直接内联阅读。
          </motion.p>
        </div>

        {/* 领域分类胶囊过滤器 (Domain Filter Pills) */}
        <div className="mb-10 sm:mb-14">
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {domains.map((domain) => {
              const isSelected = selectedDomain === domain.slug;
              return (
                <button
                  key={domain.id}
                  onClick={() => setSelectedDomain(domain.slug)}
                  className={`group relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/30"
                      : "bg-card/50 hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border/40 backdrop-blur-sm"
                  }`}
                >
                  <span>{domain.icon}</span>
                  <span>{domain.name}</span>
                  <span
                    className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-muted text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {domain.slug === "all" ? totalCount : domain.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 单篇便签流 (Memos Stream) */}
        <div className="relative border-l border-emerald-500/20 ml-3 sm:ml-6 pl-6 sm:pl-10 space-y-10 sm:space-y-12">
          <AnimatePresence mode="popLayout">
            {filteredIdeas.map((idea, index) => {
              const isLongText = (idea.excerpt?.length || 0) > 200;
              const isExpanded = expandedIds[idea.id];
              const displayContent = idea.excerpt || "暂无灵感内容";
              const domainName = idea.category?.name || "随想";
              const linkHref = routes.postDetailSlug("ideas", idea.slug || idea.id);

              return (
                <motion.article
                  key={idea.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                  className="relative group"
                >
                  {/* 左侧时间轴脉冲指示点 */}
                  <div className="absolute -left-[31px] sm:-left-[47px] top-6 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background ring-4 ring-emerald-500/20 group-hover:scale-125 transition-transform" />

                  {/* 便签卡片本体 */}
                  <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md p-6 sm:p-8 transition-all duration-300 hover:border-emerald-500/30 hover:bg-card/70 hover:shadow-xl hover:shadow-emerald-500/5">
                    {/* 卡片顶栏：领域分类 + 时间 */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-border/30">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="px-2.5 py-0.5 rounded-lg border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium"
                        >
                          <Lightbulb className="w-3 h-3 mr-1" />
                          {domainName}
                        </Badge>

                        {idea.tags && idea.tags.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            {idea.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center text-[11px] text-muted-foreground/80 hover:text-emerald-500 transition-colors"
                              >
                                <Tag className="w-2.5 h-2.5 mr-0.5 opacity-60" />
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <Calendar className="w-3.5 h-3.5 opacity-70" />
                        <time dateTime={idea.publishedAt || idea.createdAt}>
                          {formatDate(idea.publishedAt || idea.createdAt)}
                        </time>
                      </div>
                    </div>

                    {/* 便签标题 (若有) */}
                    {idea.title && (
                      <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mb-3 group-hover:text-emerald-500 transition-colors">
                        {idea.title}
                      </h2>
                    )}

                    {/* 便签核心正文 (直接直读) */}
                    <div className="relative">
                      <div
                        className={`text-foreground/85 text-sm sm:text-base leading-relaxed whitespace-pre-line transition-all duration-300 ${
                          isLongText && !isExpanded
                            ? "max-h-36 overflow-hidden mask-linear-gradient"
                            : ""
                        }`}
                      >
                        {displayContent}
                      </div>

                      {/* 长文折叠遮罩与展开按钮 */}
                      {isLongText && (
                        <div className="mt-3 flex justify-start">
                          <button
                            onClick={() => toggleExpand(idea.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors cursor-pointer"
                          >
                            <span>{isExpanded ? "收起部分" : "展开全文"}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 便签底栏：交互与分享操作 */}
                    <div className="flex items-center justify-between pt-5 mt-5 border-t border-border/20 text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() =>
                            handleCopy(idea.id, `${idea.title ? idea.title + "\n\n" : ""}${displayContent}`)
                          }
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                          title="复制正文"
                        >
                          {copiedId === idea.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-500 font-medium">已复制到剪贴板</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>复制内容</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link
                          href={linkHref}
                          className="inline-flex items-center gap-1 hover:text-emerald-500 transition-colors"
                          title="查看单篇详情"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>单篇详情</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>

          {filteredIdeas.length === 0 && (
            <div className="text-center py-20 bg-card/20 rounded-2xl border border-dashed border-border/40">
              <Lightbulb className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">该领域下暂无灵感记录</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
