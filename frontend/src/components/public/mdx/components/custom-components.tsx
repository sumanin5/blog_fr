"use client";

import React from "react";

/**
 * 交互式按钮组件
 */
export function InteractiveButton({
  text,
  message,
}: {
  text: string;
  message: string;
}) {
  return (
    <button
      onClick={() => alert(message)}
      className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50"
    >
      {text}
    </button>
  );
}

/**
 * 标签页组件
 */
export function Tabs({
  tabs,
  children,
}: {
  tabs: string[];
  children: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = React.useState(0);

  return (
    <div className="my-4 rounded-lg border border-border">
      <div className="flex border-b border-border">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === i
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/**
 * 代码组组件（多语言切换）
 */
export function CodeGroup({
  languages,
  children,
}: {
  languages: string[];
  children: React.ReactNode;
}) {
  const [activeLang, setActiveLang] = React.useState(0);

  return (
    <div className="my-4 rounded-lg border border-border bg-muted/30">
      <div className="flex gap-2 border-b border-border p-2">
        {languages.map((lang, i) => (
          <button
            key={i}
            onClick={() => setActiveLang(i)}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeLang === i
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            {lang}
          </button>
        ))}
      </div>
      <div>{children}</div>
    </div>
  );
}
