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

  const domainCards = useMemo(() => {
    const list = domains.filter((domain) => domain.slug !== "all");
    // 将有文章的领域排在前面，0 篇的排在后面，避免首屏误点空领域
    return [...list].sort((a, b) => {
      if ((a.count > 0) !== (b.count > 0)) {
        return a.count > 0 ? -1 : 1;
      }
      return 0;
    });
  }, [domains]);

  const activeDomain =
    domains.find((domain) => domain.slug === selectedDomain) ?? domains[0];
  const isAll = selectedDomain === "all";

  const activeDomainsCount = useMemo(
    () => domainCards.filter((d) => d.count > 0).length,
    [domainCards],
  );

  // 供「全部」视图右侧展示的领域封面精选（优先展示有封面的领域）
  const showcaseDomains = useMemo(() => {
    const withCovers = domainCards.filter(
      (d) =>
        getSafeImageUrl(d.coverMedia, "medium") ||
        getThumbnailUrl(d.coverMediaId, "medium"),
    );
    return (withCovers.length > 0 ? withCovers : domainCards).slice(0, 4);
  }, [domainCards]);

  const filteredIdeas = useMemo(() => {
    if (selectedDomain === "all") return initialIdeas;
    return initialIdeas.filter(
      (item) =>
        item.category?.slug === selectedDomain ||
        item.category?.id === selectedDomain,
    );
  }, [initialIdeas, selectedDomain]);

  const latestIdeaDate = useMemo(() => {
    if (!filteredIdeas.length) return null;
    const first = filteredIdeas[0];
    return first.publishedAt || first.createdAt || null;
  }, [filteredIdeas]);

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
      <main className="relative z-10 mx-auto w-full max-w-4xl px-4 pb-32 pt-20 sm:px-6 sm:pt-24">
        <Tabs value={selectedDomain} onValueChange={selectDomain}>
          {/* 顶部合一动态横幅：融合页面标题、当前领域封面视觉与领域切换栏 */}
          <section
            ref={panelRef}
            className="relative scroll-mt-24 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
          >
            {/* 氛围背景层：选中具体领域且有封面时提供柔和的环境光晕 */}
            {!isAll && heroCover ? (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <Image
                  src={heroCover}
                  alt=""
                  fill
                  sizes="(min-width: 896px) 896px, 100vw"
                  unoptimized
                  className="scale-110 object-cover opacity-15 blur-2xl"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-card/85 to-card/95" />
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-card to-card" />
            )}

            {/* 主体内容区：左侧文案信息 + 右侧封面画廊/高清封面框 */}
            <div className="relative z-10 flex flex-col gap-6 p-5 sm:p-7 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>
                      {isAll
                        ? "Digital Garden · Memos & Streams"
                        : "灵感流 · 领域专题"}
                    </span>
                  </div>

                  {!isAll && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectDomain("all")}
                      className="h-6 cursor-pointer rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      ← 返回全部
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {!isAll && (
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-base shadow-sm">
                      {activeDomain?.iconUrl ? (
                        <Image
                          src={activeDomain.iconUrl}
                          alt=""
                          width={18}
                          height={18}
                          unoptimized
                          className="h-4 w-4 object-contain"
                        />
                      ) : (
                        <span>{activeDomain?.icon || "✦"}</span>
                      )}
                    </span>
                  )}
                  <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {isAll ? (
                      <>
                        灵感流{" "}
                        <span className="font-normal text-muted-foreground">
                          / 思维碎片
                        </span>
                      </>
                    ) : (
                      activeDomain?.name || "当前领域"
                    )}
                  </h1>
                </div>

                <p className="max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {isAll
                    ? "以领域为维度的即时思考、技术随笔与探索速记。点击右侧封面或下方标签，只看你想读的那一部分。"
                    : activeDomain?.excerpt ||
                      "围绕该领域的即时思考、阅读札记与探索碎片。"}
                </p>

                {/* 统计元信息胶囊 */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/60 px-2.5 py-1 font-medium text-foreground">
                    <Lightbulb className="h-3.5 w-3.5 text-primary" />
                    {isAll
                      ? `共 ${totalCount} 篇想法`
                      : `该领域 ${filteredIdeas.length} 篇想法`}
                  </span>

                  {isAll && domainCards.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/40 px-2.5 py-1">
                      <span>{domainCards.length} 个主题领域</span>
                      {activeDomainsCount > 0 && (
                        <span className="text-muted-foreground/70">
                          ({activeDomainsCount} 个已更新)
                        </span>
                      )}
                    </span>
                  )}

                  {latestIdeaDate && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/40 px-2.5 py-1 font-mono">
                      <Calendar className="h-3 w-3 opacity-70" />
                      <span>最近更新 {formatDate(latestIdeaDate)}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* 右侧视觉区：「全部」展示领域封面画廊，「单领域」展示紧凑封面框 */}
              {isAll ? (
                showcaseDomains.length > 0 && (
                  <div className="w-full shrink-0 md:w-52 lg:w-60">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>领域封面速览</span>
                      <span className="opacity-75">点击切换</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {showcaseDomains.map((domain) => {
                        const cover =
                          getSafeImageUrl(domain.coverMedia, "medium") ||
                          getThumbnailUrl(domain.coverMediaId, "medium");

                        return (
                          <button
                            key={domain.id}
                            type="button"
                            onClick={() => selectDomain(domain.slug)}
                            className="group relative aspect-[16/10] cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-muted text-left shadow-sm transition-all hover:border-primary/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {cover ? (
                              <Image
                                src={cover}
                                alt={domain.name}
                                fill
                                sizes="120px"
                                unoptimized
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-secondary text-lg">
                                {domain.icon || "✦"}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
                            <div className="absolute inset-x-2 bottom-1.5 flex items-end justify-between gap-1">
                              <span className="truncate text-xs font-medium text-foreground">
                                {domain.name}
                              </span>
                              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                {domain.count}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              ) : (
                <div className="w-full shrink-0 md:w-48 lg:w-56">
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border/60 bg-muted shadow-md">
                    {heroCover ? (
                      <Image
                        src={heroCover}
                        alt={activeDomain?.name || ""}
                        fill
                        sizes="(min-width: 768px) 224px, 100vw"
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-secondary text-muted-foreground">
                        <span className="text-2xl">
                          {activeDomain?.icon || "✦"}
                        </span>
                        <span className="text-xs">{activeDomain?.name}</span>
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                    <div className="absolute bottom-2 right-2 rounded-md border border-border/60 bg-background/85 px-2 py-0.5 font-mono text-xs text-foreground backdrop-blur-sm">
                      {filteredIdeas.length} 篇
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 底部内嵌领域切换栏：与顶部横幅融为一体，不再分离成独立图层 */}
            <div className="relative z-10 border-t border-border/60 bg-background/50 px-3 py-2.5 backdrop-blur-md sm:px-5">
              <TabsList className="flex h-auto w-full justify-start gap-1.5 overflow-x-auto bg-transparent p-0 scrollbar-none">
                <TabsTrigger
                  value="all"
                  className="h-auto flex-none cursor-pointer gap-2 rounded-xl border border-transparent px-3 py-1.5 data-[state=active]:border-primary/40 data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/60 text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    全部
                  </span>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {totalCount}
                  </span>
                </TabsTrigger>

                {domainCards.map((domain) => {
                  const thumb =
                    getSafeImageUrl(domain.coverMedia, "small") ||
                    getThumbnailUrl(domain.coverMediaId, "small");
                  const isEmpty = domain.count === 0;

                  return (
                    <TabsTrigger
                      key={domain.id}
                      value={domain.slug}
                      className={cn(
                        "h-auto flex-none cursor-pointer gap-2 rounded-xl border border-transparent px-2.5 py-1.5 transition-opacity data-[state=active]:border-primary/40 data-[state=active]:bg-card data-[state=active]:opacity-100 data-[state=active]:shadow-sm",
                        isEmpty && "opacity-60 hover:opacity-90",
                      )}
                    >
                      <span className="relative h-7 w-9 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            fill
                            sizes="36px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-xs">
                            {domain.icon || "✦"}
                          </span>
                        )}
                      </span>
                      <span className="max-w-36 truncate text-xs font-medium text-foreground">
                        {domain.name}
                      </span>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        {domain.count}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          </section>

          {/* 下方时间线想法流：与上方横幅严格同宽对齐，无重复小标题 */}
          <TabsContent value={selectedDomain} className="mt-8 outline-none">
            {filteredIdeas.length > 0 ? (
              <div
                id="idea-stream"
                className="relative ml-2 space-y-6 border-l-2 border-border/60 pl-5 sm:ml-3 sm:pl-7"
              >
                <AnimatePresence mode="popLayout">
                  {filteredIdeas.map((idea, index) => {
                    const isLongText = (idea.excerpt?.length || 0) > 200;
                    const isExpanded = expandedIds[idea.id];
                    const displayContent = idea.excerpt || "暂无灵感内容";
                    const domainName = idea.category?.name || "随想";
                    const domainSlug = idea.category?.slug;
                    const linkHref = routes.postDetailSlug(
                      "ideas",
                      idea.slug || idea.id,
                    );
                    const ideaCover =
                      getSafeImageUrl(idea.coverMedia, "large") ||
                      getThumbnailUrl(idea.coverMediaId, "large");

                    return (
                      <motion.article
                        key={idea.id}
                        layout
                        initial={false}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.25, delay: index * 0.04 }}
                        className="group relative"
                      >
                        {/* 时间线节点圆点 */}
                        <span
                          aria-hidden="true"
                          className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background ring-4 ring-background transition-transform duration-200 group-hover:scale-125 group-hover:bg-primary sm:-left-[35px]"
                        />

                        {/* 时间线顶部元信息栏：日期 + 所属领域 + 标签 */}
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <time
                              dateTime={idea.publishedAt || idea.createdAt}
                              className="font-mono text-xs font-medium text-muted-foreground"
                            >
                              {formatDate(idea.publishedAt || idea.createdAt)}
                            </time>

                            <Badge
                              variant="outline"
                              onClick={() => {
                                if (domainSlug && selectedDomain !== domainSlug) {
                                  selectDomain(domainSlug);
                                }
                              }}
                              className={cn(
                                "rounded-md border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary",
                                domainSlug &&
                                  selectedDomain !== domainSlug &&
                                  "cursor-pointer hover:bg-primary/20",
                              )}
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
                        </div>

                        {/* 想法内容卡片 */}
                        <Card className="relative gap-0 overflow-hidden rounded-2xl border-border/60 bg-card/70 py-0 shadow-sm backdrop-blur-sm transition-colors duration-300 hover:border-primary/30 hover:bg-card">
                          {/* 如果配有封面图，在卡片背景右侧注入柔和氛围光晕 */}
                          {ideaCover && (
                            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                              <Image
                                src={ideaCover}
                                alt=""
                                fill
                                sizes="400px"
                                unoptimized
                                className="scale-110 object-cover opacity-10 blur-2xl"
                              />
                              <div className="absolute inset-0 bg-gradient-to-r from-card via-card/95 to-card/75" />
                            </div>
                          )}

                          <CardContent className="relative z-10 p-5 sm:p-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                              <div className="min-w-0 flex-1">
                                {idea.title && (
                                  <CardTitle className="mb-2.5 text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-xl">
                                    <Link href={linkHref} className="hover:underline">
                                      {idea.title}
                                    </Link>
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
                                        <span>
                                          {isExpanded ? "收起部分" : "展开全文"}
                                        </span>
                                        {isExpanded ? (
                                          <ChevronUp className="ml-1 h-3.5 w-3.5" />
                                        ) : (
                                          <ChevronDown className="ml-1 h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 右侧内嵌紧凑封面缩略图，不喧宾夺主 */}
                              {ideaCover && (
                                <Link
                                  href={linkHref}
                                  className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm sm:w-36 md:w-44"
                                >
                                  <Image
                                    src={ideaCover}
                                    alt={idea.title || ""}
                                    fill
                                    sizes="(min-width: 640px) 176px, 100vw"
                                    unoptimized
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                </Link>
                              )}
                            </div>
                          </CardContent>

                          <Separator className="opacity-30" />

                          <CardFooter className="flex items-center justify-between px-5 py-2.5 text-xs text-muted-foreground sm:px-6">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleCopy(
                                  idea.id,
                                  `${idea.title ? `${idea.title}\n\n` : ""}${displayContent}`,
                                )
                              }
                              className="h-7 cursor-pointer px-2 text-xs text-muted-foreground hover:text-foreground"
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
                              className="h-7 cursor-pointer px-2 text-xs text-muted-foreground hover:text-primary"
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
              </div>
            ) : (
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
