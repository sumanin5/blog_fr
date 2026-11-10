"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tabs as ShadcnTabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

/**
 * 交互式按钮组件 (基于 shadcn Button)
 */
export function InteractiveButton({
  text,
  message,
}: {
  text: string;
  message: string;
}) {
  return (
    <Button
      variant="default"
      onClick={() => alert(message)}
    >
      {text}
    </Button>
  );
}

/**
 * 标签页组件 (基于 shadcn Tabs)
 */
export function Tabs({
  tabs,
  children,
}: {
  tabs: string[];
  children: React.ReactNode;
}) {
  const childrenArray = React.Children.toArray(children);
  const defaultTab = tabs[0] || "0";

  return (
    <ShadcnTabs defaultValue={defaultTab} className="my-4 rounded-lg border border-border">
      <TabsList className="w-full justify-start rounded-b-none border-b border-border bg-muted/30 p-1">
        {tabs.map((tab, i) => (
          <TabsTrigger key={i} value={tab || String(i)}>
            {tab}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab, i) => (
        <TabsContent key={i} value={tab || String(i)} className="p-4 mt-0">
          {childrenArray[i] ?? children}
        </TabsContent>
      ))}
    </ShadcnTabs>
  );
}

/**
 * 代码组组件（多语言切换，基于 shadcn Tabs）
 */
export function CodeGroup({
  languages,
  children,
}: {
  languages: string[];
  children: React.ReactNode;
}) {
  const childrenArray = React.Children.toArray(children);
  const defaultLang = languages[0] || "0";

  return (
    <ShadcnTabs defaultValue={defaultLang} className="my-4 rounded-lg border border-border bg-muted/20">
      <TabsList className="w-full justify-start rounded-b-none border-b border-border bg-muted/40 p-1 gap-1">
        {languages.map((lang, i) => (
          <TabsTrigger key={i} value={lang || String(i)} className="text-xs">
            {lang}
          </TabsTrigger>
        ))}
      </TabsList>
      {languages.map((lang, i) => (
        <TabsContent key={i} value={lang || String(i)} className="p-0 mt-0">
          {childrenArray[i] ?? children}
        </TabsContent>
      ))}
    </ShadcnTabs>
  );
}
