"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Lightbulb,
  Sparkles,
  Tag,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSafeImageUrl, getThumbnailUrl } from "@/lib/media-utils";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { PostShortResponse } from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";

export interface IdeaDomain {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  iconUrl?: string | null;
  count: number;
  excerpt?: string;
  coverMedia?: {
    id: string;
    mimeType?: string;
    mime_type?: string;
    altText?: string | null;
  } | null;
  coverMediaId?: string | null;
}

interface IdeaStreamViewProps {
  initialIdeas: ApiData<PostShortResponse>[];
  domains: IdeaDomain[];
  totalCount: number;
  initialDomain?: string;
}

export function IdeaStreamView({
  initialIdeas,
  domains,
  totalCount,
  initialDomain = "all",
}: IdeaStreamViewProps) {
  const [selectedDomain, setSelectedDomain] = useState<string>(initialDomain);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  const domainCards = useMemo(
    () => domains.filter((domain) => domain.slug !== "all"),
    [domains],
  );
  const activeDomain =
    domains.find((domain) => domain.slug === selectedDomain) ?? domains[0];
  const isAll = selectedDomain === "all";

  const filteredIdeas = useMemo(() => {
    if (selectedDomain === "all") return initialIdeas;
    return initialIdeas.filter(
      (item) =>
        item.category?.slug === selectedDomain ||
        item.category?.id === selectedDomain,
    );
  }, [initialIdeas, selectedDomain]);

  const heroCover = activeDomain
    ? getSafeImageUrl(activeDomain.coverMedia, "xlarge") ||
      getThumbnailUrl(activeDomain.coverMediaId, "xlarge")
    : null;

  const selectDomain = (slug: string) => {
    setSelectedDomain(slug);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (slug === "all") {
        url.searchParams.delete("domain");
      } else {
        url.searchParams.set("domain", slug);
      }
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }

    window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  useEffect(() => {
    const syncFromUrl = () => {
      const value = new URLSearchParams(window.location.search).get("domain");
      setSelectedDomain(
        value && domains.some((domain) => domain.slug === value)
          ? value
          : "all",
      );
    };

    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [domains]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-20 sm:px-6 sm:pt-24">
        {/* 页面标题收短，把视觉空间让给当前领域 */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Digital Garden · Memos & Streams</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              灵感流{" "}
              <span className="text-muted-foreground">/ 思维碎片</span>
            </h1>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-sm">
            以领域为维度组织想法。选中一个领域后，这里只展示该领域的完整内容。
          </p>
        </header>

        <Tabs value={selectedDomain} onValueChange={selectDomain}>
          {/* 领域导轨：其他领域退到顶部，只作为切换入口 */}
          <div className="sticky top-16 z-20 -mx-1 mb-6 bg-background/80 px-1 py-2 backdrop-blur-md sm:top-20">
            <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-border/60 bg-card/60 p-1.5 scrollbar-none">
              <TabsTrigger
                value="all"
                className="h-auto flex-none gap-2 rounded-lg border border-transparent px-2.5 py-2 data-[state=active]:border-border/60 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/50 text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-xs font-medium text-foreground">
                    全部
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {totalCount} 篇
                  </span>
                </span>
              </TabsTrigger>

              {domainCards.map((domain) => {
                const thumb =
                  getSafeImageUrl(domain.coverMedia, "small") ||
                  getThumbnailUrl(domain.coverMediaId, "small");

                return (
                  <TabsTrigger
                    key={domain.id}
                    value={domain.slug}
                    className="h-auto flex-none gap-2 rounded-lg border border-transparent px-2 py-2 data-[state=active]:border-border/60 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <span className="relative h-9 w-12 shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt=""
                          fill
                          sizes="48px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-sm">
                          {domain.icon || "✦"}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block max-w-28 truncate text-xs font-medium text-foreground">
                        {domain.name}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {domain.count} 篇
                      </span>
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value={selectedDomain} className="mt-0 outline-none">
            <div ref={panelRef} className="scroll-mt-40">
              {/* 当前领域主视觉：占据整块内容区 */}
              <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card">
                {!isAll && heroCover ? (
                  <Image
                    src={heroCover}
                    alt=""
                    fill
                    sizes="(min-width: 1152px) 1152px, 100vw"
                    unoptimized
                    className="object-cover opacity-40"
                  />
                ) : null}
                <div
                  className={cn(
                    "absolute inset-0",
                    isAll
                      ? "bg-gradient-to-br from-primary/10 via-card to-card"
                      : "bg-gradient-to-r from-background via-background/80 to-background/20",
                  )}
                />
                <div className="relative z-10 flex min-h-48 flex-col justify-end gap-3 p-6 sm:min-h-64 sm:p-9">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-border/60 bg-background/80 px-1.5">
                      {isAll ? (
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      ) : activeDomain?.iconUrl ? (
                        <Image
                          src={activeDomain.iconUrl}
                          alt=""
                          width={16}
                          height={16}
                          unoptimized
                          className="h-4 w-4 object-contain"
                        />
                      ) : (
                        <span>{activeDomain?.icon || "✦"}</span>
                      )}
                    </span>
                    <span>{isAll ? "全部领域" : "领域"}</span>
                    <span className="opacity-50">/</span>
                    <span>{filteredIdeas.length} 篇</span>
                  </div>

                  <h2 className="max-w-3xl text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
                    {isAll ? "全部想法" : activeDomain?.name || "当前领域"}
                  </h2>

                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {isAll
                      ? "以领域为维度的即时思考、技术随笔与探索速记。选择一个领域，只看你想读的那一部分。"
                      : activeDomain?.excerpt || "这个领域还没有简介。"}
                  </p>
                </div>
              </section>

              {/* 当前领域的想法流 */}
              <section className="mx-auto mt-8 max-w-4xl">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">
                      {isAll ? "全部想法" : "领域想法"}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {filteredIdeas.length} 篇 · 按发布时间倒序
                    </p>
                  </div>
                </div>

                <div id="idea-stream" className="space-y-6">
                  <AnimatePresence mode="popLayout">
                    {filteredIdeas.map((idea, index) => {
                      const isLongText = (idea.excerpt?.length || 0) > 200;
                      const isExpanded = expandedIds[idea.id];
                      const displayContent = idea.excerpt || "暂无灵感内容";
                      const domainName = idea.category?.name || "随想";
                      const linkHref = routes.postDetailSlug(
                        "ideas",
                        idea.slug || idea.id,
                      );

                      return (
                        <motion.article
                          key={idea.id}
                          layout
                          initial={false}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.3, delay: index * 0.04 }}
                          className="group"
                        >
                          <Card className="gap-0 overflow-hidden rounded-2xl border-border/50 bg-card/60 py-0 backdrop-blur-sm transition-colors duration-300 hover:border-primary/30 hover:bg-card/80">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-3 sm:p-7">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="rounded-lg border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                                >
                                  <Lightbulb className="mr-1 h-3 w-3" />
                                  {domainName}
                                </Badge>

                                {idea.tags && idea.tags.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {idea.tags.map((tag) => (
                                      <span
                                        key={tag.id}
                                        className="inline-flex items-center text-xs text-muted-foreground/80 transition-colors hover:text-primary"
                                      >
                                        <Tag className="mr-0.5 h-2.5 w-2.5 opacity-60" />
                                        {tag.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5 opacity-70" />
                                <time dateTime={idea.publishedAt || idea.createdAt}>
                                  {formatDate(idea.publishedAt || idea.createdAt)}
                                </time>
                              </div>
                            </CardHeader>

                            <CardContent className="px-5 pb-3 pt-0 sm:px-7">
                              {idea.title && (
                                <CardTitle className="mb-3 text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-xl">
                                  {idea.title}
                                </CardTitle>
                              )}

                              <div className="relative">
                                <div
                                  className={cn(
                                    "whitespace-pre-line text-sm leading-relaxed text-foreground/85 transition-all duration-300 sm:text-base",
                                    isLongText &&
                                      !isExpanded &&
                                      "mask-linear-gradient max-h-36 overflow-hidden",
                                  )}
                                >
                                  {displayContent}
                                </div>

                                {isLongText && (
                                  <div className="mt-3 flex justify-start">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleExpand(idea.id)}
                                      className="h-7 cursor-pointer px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                                    >
                                      <span>{isExpanded ? "收起部分" : "展开全文"}</span>
                                      {isExpanded ? (
                                        <ChevronUp className="ml-1 h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronDown className="ml-1 h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>

                            <Separator className="opacity-40" />

                            <CardFooter className="flex items-center justify-between px-5 py-3 text-xs text-muted-foreground sm:px-7">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCopy(
                                    idea.id,
                                    `${idea.title ? `${idea.title}\n\n` : ""}${displayContent}`,
                                  )
                                }
                                className="h-8 cursor-pointer px-2.5 text-xs text-muted-foreground hover:text-foreground"
                              >
                                {copiedId === idea.id ? (
                                  <>
                                    <Check className="mr-1.5 h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium text-primary">
                                      已复制到剪贴板
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                                    <span>复制内容</span>
                                  </>
                                )}
                              </Button>

                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-8 cursor-pointer px-2.5 text-xs text-muted-foreground hover:text-primary"
                              >
                                <Link href={linkHref}>
                                  <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                                  <span>单篇详情</span>
                                </Link>
                              </Button>
                            </CardFooter>
                          </Card>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>

                  {filteredIdeas.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 px-6 py-16 text-center">
                      <Lightbulb className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-40" />
                      <p className="text-sm text-muted-foreground">
                        这个领域还没有已发布的想法
                      </p>
                      {!isAll && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => selectDomain("all")}
                        >
                          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                          看看全部想法
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
