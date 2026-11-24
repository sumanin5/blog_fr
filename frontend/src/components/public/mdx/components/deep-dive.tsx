"use client";

import * as React from "react";
import { Microscope } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export interface DeepDiveProps {
  /** 折叠面板标题 */
  title: string;
  /** 可选的一句话导读，收起态也可见 */
  summary?: string;
  /** 默认是否展开，默认 false */
  defaultOpen?: boolean;
  /** 可选徽章文字，默认 "深挖" */
  badge?: string;
  /** 折叠区内部内容（支持标准 Markdown / MDX 语法） */
  children: React.ReactNode;
}

/**
 * 折叠深挖盒：为面向大众的随笔提供可选的底层技术细节入口。
 * 普通读者可直接略过，有兴趣的读者展开阅读。
 */
export function DeepDive({
  title,
  summary,
  defaultOpen = false,
  badge = "深挖",
  children,
}: DeepDiveProps) {
  return (
    <div className="not-prose my-6 rounded-xl border border-border/70 bg-card/60 px-4 shadow-xs transition-colors hover:border-border sm:px-5">
      <Accordion
        type="single"
        collapsible
        defaultValue={defaultOpen ? "deep-dive" : undefined}
      >
        <AccordionItem value="deep-dive" className="border-b-0">
          <AccordionTrigger className="gap-3 py-4 hover:no-underline">
            <span className="flex flex-1 flex-col items-start gap-1 text-left">
              <span className="flex flex-wrap items-center gap-2">
                <Microscope
                  aria-hidden="true"
                  className="size-4 shrink-0 text-primary"
                />
                <Badge variant="secondary" className="text-xs font-medium">
                  {badge}
                </Badge>
                <span className="text-sm font-semibold text-foreground sm:text-base">
                  {title}
                </span>
              </span>
              {summary ? (
                <span className="text-xs font-normal leading-relaxed text-muted-foreground sm:text-sm">
                  {summary}
                </span>
              ) : null}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-0">
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none border-t border-border/50 pt-4 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              {children}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
