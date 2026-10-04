"use client";

import React, { useState } from "react";
import {
  Zap,
  Bot,
  BookOpen,
  HelpCircle,
  Check,
  Copy,
  Info,
  Layers,
} from "lucide-react";
import type { ProductGuideSection, ProductFAQ } from "@/config/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

interface ProjectDocsProps {
  productName: string;
  guides?: ProductGuideSection[];
  faqs?: ProductFAQ[];
}

export function ProjectDocs({
  productName,
  guides = [],
  faqs = [],
}: ProjectDocsProps) {
  const [activeTab, setActiveTab] = useState<string>(
    guides[0]?.id || (faqs.length > 0 ? "faq" : ""),
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (guides.length === 0 && faqs.length === 0) {
    return null;
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getTabIcon = (iconName: string) => {
    switch (iconName) {
      case "Zap":
        return <Zap className="w-4 h-4" />;
      case "Bot":
        return <Bot className="w-4 h-4" />;
      case "BookOpen":
        return <BookOpen className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  return (
    <section id="docs" className="scroll-mt-24 mb-24">
      {/* 模块主标题 */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <Badge
          variant="outline"
          className="mb-3 px-3 py-1 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 font-mono"
        >
          DOCUMENTATION & USAGE
        </Badge>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          使用指南与核心用法
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          清晰详实的新手引导、工作流配置与功能指南，帮助您快速将 {productName} 融入日常创作。
        </p>
      </div>

      {/* 基于 shadcn Tabs 体系打造的文档容器 */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-2xl shadow-xl overflow-hidden"
      >
        {/* 顶部 Tab 切换横栏 (使用 shadcn TabsList + TabsTrigger) */}
        <div className="p-2 sm:p-3 bg-muted/40 border-b border-border/40 overflow-x-auto no-scrollbar">
          <TabsList className="bg-transparent h-auto p-0 gap-1.5 flex justify-start">
            {guides.map((guide) => (
              <TabsTrigger
                key={guide.id}
                value={guide.id}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {getTabIcon(guide.icon)}
                <span>{guide.title}</span>
              </TabsTrigger>
            ))}

            {faqs.length > 0 && (
              <TabsTrigger
                value="faq"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>常见疑问 (FAQ)</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Tab 内容视窗 */}
        <div className="p-6 sm:p-10">
          {/* 指南模式 (遍历每个 guide 对应一个 TabsContent) */}
          {guides.map((guide) => (
            <TabsContent
              key={guide.id}
              value={guide.id}
              className="space-y-8 mt-0 focus-visible:outline-none animate-in fade-in duration-300"
            >
              {/* 指南头部副标 */}
              <div className="border-b border-border/30 pb-4">
                <h3 className="text-xl font-bold text-foreground">
                  {guide.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {guide.tagline}
                </p>
              </div>

              {/* 步骤列表 */}
              <div className="space-y-6">
                {guide.steps.map((stepItem) => (
                  <Card
                    key={stepItem.step}
                    className="group relative flex flex-col md:flex-row gap-4 sm:gap-6 p-5 sm:p-6 rounded-xl border-border/30 bg-background/40 hover:bg-background/70 hover:border-border/60 transition-all py-0 gap-0 overflow-hidden"
                  >
                    {/* 步骤大序号徽章 */}
                    <div className="p-5 sm:p-6 pb-0 md:pb-6 flex-shrink-0 flex items-center md:items-start">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center justify-center text-sm shadow-xs">
                        {stepItem.step}
                      </div>
                    </div>

                    {/* 步骤内容说明 */}
                    <div className="p-5 sm:p-6 pt-0 md:pt-6 md:pl-0 flex-1 space-y-3">
                      <h4 className="text-base font-semibold text-foreground">
                        {stepItem.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {stepItem.description}
                      </p>

                      {/* 可选的代码/配置块 */}
                      {stepItem.code && (
                        <div className="relative mt-3 rounded-lg overflow-hidden border border-border/60 bg-[#1e1e1e] font-mono text-xs">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 border-b border-white/5 text-[11px] text-zinc-400">
                            <span>配置示例 (YAML / Key)</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => handleCopy(stepItem.code!)}
                              className="h-6 px-2 text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors cursor-pointer"
                              title="复制配置"
                            >
                              {copiedCode === stepItem.code ? (
                                <>
                                  <Check className="w-3 h-3 mr-1 text-emerald-400" />
                                  <span className="text-emerald-400">已复制</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 mr-1" />
                                  <span>复制</span>
                                </>
                              )}
                            </Button>
                          </div>
                          <pre className="p-4 text-emerald-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                            {stepItem.code}
                          </pre>
                        </div>
                      )}

                      {/* 可选的小贴士 */}
                      {stepItem.tips && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-xs text-muted-foreground">
                          <Info className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{stepItem.tips}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}

          {/* 常见问题 FAQ 模式 (TabsContent value="faq") */}
          {faqs.length > 0 && (
            <TabsContent
              value="faq"
              className="space-y-4 mt-0 focus-visible:outline-none animate-in fade-in duration-300"
            >
              <div className="border-b border-border/30 pb-4 mb-6">
                <h3 className="text-xl font-bold text-foreground">
                  常见疑问解答 (FAQ)
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  有关本地数据所有权、格式兼容性与技术机制的常见问答
                </p>
              </div>

              <Accordion
                type="single"
                collapsible
                defaultValue="item-0"
                className="space-y-3"
              >
                {faqs.map((faq, idx) => (
                  <AccordionItem
                    key={faq.question}
                    value={`item-${idx}`}
                    className="rounded-xl border border-border/40 bg-background/40 px-4 sm:px-5 border-b-0"
                  >
                    <AccordionTrigger className="text-sm sm:text-base font-semibold hover:no-underline text-foreground py-4 sm:py-5">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1 pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </section>
  );
}
