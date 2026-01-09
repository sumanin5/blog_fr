"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  title: string;
  level: number;
}

interface PostTocProps {
  toc: TocItem[];
  className?: string;
}

/**
 * 文章目录组件
 *
 * 功能：
 * - 显示文章目录结构
 * - 高亮当前阅读位置
 * - 点击滚动到对应标题
 */
export function PostToc({ toc, className = "" }: PostTocProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-80px 0px -80% 0px",
      }
    );

    // 观察所有标题元素
    toc.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [toc]);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const top = element.offsetTop - 80; // 减去 header 高度
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  if (toc.length === 0) return null;

  return (
    <nav className={cn("space-y-2", className)}>
      <h3 className="text-sm font-semibold">目录</h3>
      <ul className="space-y-1 text-sm">
        {toc.map((item) => (
          <li
            key={item.id}
            style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
          >
            <button
              onClick={() => handleClick(item.id)}
              className={cn(
                "block w-full text-left transition-colors hover:text-foreground",
                activeId === item.id
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
