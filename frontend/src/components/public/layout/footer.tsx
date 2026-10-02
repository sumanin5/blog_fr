import React from "react";

/**
 * 🦶 全局极简页脚落款
 *
 * 核心设计：
 * 1. 彻底取缔繁复多栏链接堆砌，不喧宾夺主；
 * 2. 零实底背景、零分割线，完全融入背景点阵；
 * 3. 仅保留最轻柔纯净的单行极客版权落款。
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative py-8 mt-4 text-xs font-mono text-muted-foreground/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div>
          © {currentYear} BLOG_FR · Crafted with care & digital garden philosophy.
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
          <span>All systems normal · 2026</span>
        </div>
      </div>
    </footer>
  );
}
