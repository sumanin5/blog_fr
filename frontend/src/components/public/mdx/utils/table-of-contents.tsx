"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { List } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface TocItem {
  id: string;
  title: string;
  level: number;
}

interface TableOfContentsProps {
  toc: TocItem[];
  className?: string;
  mode?: "sidebar" | "sheet";
}

function useActiveHeading(toc: TocItem[]) {
  const [activeId, setActiveId] = useState<string>(toc[0]?.id ?? "");

  useEffect(() => {
    if (toc.length === 0) return;

    const elements = toc
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          );

        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-96px 0px -70% 0px",
        threshold: [0, 1],
      },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [toc]);

  return { activeId, setActiveId };
}

function TocList({
  toc,
  activeId,
  onSelect,
}: {
  toc: TocItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const items = useMemo(() => {
    const contentItems = toc.filter((item) => item.level >= 2);
    return contentItems.length > 0 ? contentItems : toc;
  }, [toc]);

  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const isActive = activeId === item.id;
        const depth = Math.max(0, item.level - 2);

        return (
          <li key={item.id}>
            <a
              data-toc-id={item.id}
              href={`#${item.id}`}
              onClick={() => onSelect(item.id)}
              style={{ paddingLeft: `${12 + depth * 12}px` }}
              className={cn(
                "block border-l py-1.5 pr-2 text-[13px] leading-5 transition-colors",
                isActive
                  ? "border-emerald-500 font-medium text-foreground"
                  : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {item.title}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function TableOfContents({
  toc,
  className,
  mode = "sidebar",
}: TableOfContentsProps) {
  const { activeId, setActiveId } = useActiveHeading(toc);
  const listRef = useRef<HTMLDivElement>(null);
  const title = "On this page";

  // 目录较长时，让当前高亮的标题保持在目录可视范围内。
  // 只滚动目录容器本身：scrollIntoView 会连带滚动页面，打断阅读。
  useEffect(() => {
    const container = listRef.current;
    if (!container || !activeId) return;
    const link = container.querySelector<HTMLElement>(
      `[data-toc-id="${CSS.escape(activeId)}"]`,
    );
    if (!link) return;

    const margin = 48;
    // 容器为 relative，offsetTop 即相对目录容器的位置
    const top = link.offsetTop;
    const bottom = top + link.offsetHeight;
    if (top < container.scrollTop + margin) {
      container.scrollTo({ top: Math.max(0, top - margin), behavior: "smooth" });
    } else if (bottom > container.scrollTop + container.clientHeight - margin) {
      container.scrollTo({
        top: bottom - container.clientHeight + margin,
        behavior: "smooth",
      });
    }
  }, [activeId]);

  if (toc.length === 0) return null;

  if (mode === "sheet") {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2 xl:hidden", className)}
          >
            <List className="h-4 w-4" />
            <span>目录</span>
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="w-[320px] pt-12">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <List className="h-4 w-4" />
              {title}
            </SheetTitle>
            <SheetDescription className="sr-only">
              当前文章标题导航
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-9rem)] pr-4">
            <TocList
              toc={toc}
              activeId={activeId}
              onSelect={setActiveId}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <nav aria-label={title} className={cn("text-sm", className)}>
      <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <List className="h-3.5 w-3.5" />
        <span>{title}</span>
      </div>

      {/*
        用原生滚动而不是 ScrollArea：Radix 视口是 size-full，父级只有 max-h 时
        百分比高度失效，内容会撑出容器而不出现滚动条。
        高度 = 视口 - 粘性 top(5rem) - 标题行 - 底部留白，保证整个目录始终在屏内。
      */}
      <div
        ref={listRef}
        className="relative max-h-[calc(100dvh-9rem)] overflow-y-auto overscroll-contain pr-3 [scrollbar-width:thin]"
      >
        <TocList toc={toc} activeId={activeId} onSelect={setActiveId} />
      </div>
    </nav>
  );
}
