"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ChevronDown, ChevronRight, Menu } from "lucide-react";

export interface TocItem {
  id: string;
  title: string;
  level: number;
}

interface TableOfContentsProps {
  toc: TocItem[];
  className?: string;
}

export function TableOfContents({ toc, className }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  // 初始化的时候就计算好默认展开状态
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const defaultExpanded = new Set<string>();
    toc.forEach((item) => {
      if (item.level === 1) defaultExpanded.add(item.id);
    });
    return defaultExpanded;
  });

  // 监听滚动，高亮当前标题
  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          setActiveId(visibleEntries[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );

    toc.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [toc]);

  const handleItemClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const top = element.offsetTop - 80;
      window.scrollTo({ top, behavior: "smooth" });

      // 更新 URL hash，但不触发跳转
      window.history.replaceState(null, "", `#${id}`);
      setActiveId(id);

      // 优化交互：点击父标题时，自动展开它的子菜单
      // 这样用户跳转过去后，也能在目录里看到下面的子结构
      setExpandedIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(id);
        return newSet;
      });

      setIsOpen(false); // 关闭侧边栏
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const hasChildren = (index: number) => {
    if (index === toc.length - 1) return false;
    return toc[index + 1].level > toc[index].level;
  };

  const shouldShow = (index: number) => {
    const item = toc[index];
    if (item.level === 1) return true;
    let currentLevel = item.level;
    for (let i = index - 1; i >= 0; i--) {
      const prev = toc[i];
      if (prev.level < currentLevel) {
        if (!expandedIds.has(prev.id)) return false;
        currentLevel = prev.level;
        if (currentLevel === 1) return true;
      }
    }
    return true;
  };

  if (toc.length === 0) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "fixed top-24 left-4 z-40 gap-2 shadow-md backdrop-blur-sm bg-background/80 transition-all hover:bg-background hover:shadow-lg",
            "flex", // Always show the button
            className
          )}
        >
          <Menu className="h-4 w-4" />
          <span className="hidden sm:inline">目录</span>
        </Button>
      </SheetTrigger>
      {/*
          也可以为移动端添加一个 Trigger，如下：
          <SheetTrigger asChild>
             <Button className="xl:hidden fixed bottom-4 right-4 z-50 rounded-full h-12 w-12 shadow-lg" size="icon">
                <Menu />
             </Button>
          </SheetTrigger>
      */}

      <SheetContent side="left" className="w-[300px] sm:w-[400px] pt-12">
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <Menu className="h-5 w-5" />
            文章目录
          </SheetTitle>
        </SheetHeader>

        <div className="mb-4 text-xs text-muted-foreground flex justify-between px-1">
          <span>{toc.length} 个标题</span>
          <span>
            {Math.round(
              ((toc.findIndex((t) => t.id === activeId) + 1) / toc.length) * 100
            ) || 0}
            % 阅读进度
          </span>
        </div>

        <ScrollArea className="h-[calc(100vh-10rem)] pr-4">
          <div className="space-y-1 pb-10">
            {toc.map((item, index) => {
              if (!shouldShow(index)) return null;

              const isActive = activeId === item.id;
              const hasChild = hasChildren(index);
              const isExpanded = expandedIds.has(item.id);
              const paddingLeft = (item.level - 1) * 12 + 4;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent/50",
                    isActive && "bg-accent text-accent-foreground font-medium"
                  )}
                  style={{ paddingLeft: `${paddingLeft}px` }}
                >
                  {hasChild ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(item.id);
                      }}
                      className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100 flex items-center justify-center"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </button>
                  ) : (
                    <span className="w-4 shrink-0" />
                  )}

                  <button
                    onClick={() => handleItemClick(item.id)}
                    className={cn(
                      "flex-1 text-left truncate leading-tight",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                    title={item.title}
                  >
                    {item.title}
                  </button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
