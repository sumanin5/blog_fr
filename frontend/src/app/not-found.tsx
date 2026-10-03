"use client";

import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Home,
  BookOpen,
  Lightbulb,
  User,
  Compass,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const LostCoordinate3D = dynamic(
  () => import("@/components/public/not-found/lost-coordinate-3d"),
  {
    ssr: false,
    loading: () => (
      <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 animate-pulse" />
      </div>
    ),
  },
);

interface NavShortcut {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  color: string;
}

const NAV_SHORTCUTS: NavShortcut[] = [
  {
    icon: Home,
    title: "花园首页",
    description: "返回数字花园主入口与全景展台",
    href: "/",
    color: "emerald",
  },
  {
    icon: BookOpen,
    title: "专栏专题",
    description: "探索体系化深度架构与技术专题",
    href: "/posts/articles/categories",
    color: "teal",
  },
  {
    icon: Lightbulb,
    title: "灵感便签流",
    description: "按领域浏览即时思考与思维碎片",
    href: "/posts/ideas",
    color: "amber",
  },
  {
    icon: User,
    title: "关于本站",
    description: "了解博主理念、技术栈与工程实践",
    href: "/about",
    color: "cyan",
  },
];

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-[90vh] flex-col items-center justify-center px-4 py-16 sm:py-24">
      {/* 背景柔和翡翠极光光晕 */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 blur-[140px] rounded-full" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-teal-500/10 blur-[100px] rounded-full" />

      <div className="relative z-10 w-full max-w-2xl mx-auto text-center">
        {/* 顶部微型 Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium mb-6 backdrop-blur-md"
        >
          <Compass className="w-3.5 h-3.5 animate-spin-slow" />
          <span>Error 404 · Lost Coordinate</span>
        </motion.div>

        {/* 404 核心视觉：嵌入 3D 失重多面体与公转星轨 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-6 flex items-center justify-center gap-2 sm:gap-4 font-mono font-black text-8xl sm:text-9xl tracking-tighter select-none"
        >
          <span className="text-transparent bg-clip-text bg-linear-to-b from-foreground to-foreground/50">
            4
          </span>

          {/* 中间的 0 改造为实时 3D 失重多面体与公转星环 */}
          <div className="relative flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 mx-1">
            <LostCoordinate3D />
          </div>

          <span className="text-transparent bg-clip-text bg-linear-to-b from-foreground to-foreground/50">
            4
          </span>
        </motion.div>

        {/* 沉浸式意境文案 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3 mb-10"
        >
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            迷航在思维的未涉之地
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            你所探索的知识坐标可能已被重构、归档，或尚未在此处生根发芽。
          </p>
        </motion.div>

        {/* 核心操作卡片 (Compass Shortcuts) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl p-6 sm:p-8 text-left shadow-xl hover:border-border/60 transition-colors mb-6"
        >
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/30">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              重新定向 · 推荐坐标
            </span>
          </div>

          {/* 4 个高质量快捷入口 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {NAV_SHORTCUTS.map((item) => (
              <Link
                key={item.href}
                href={item.href as Route}
                className="group flex items-start gap-3 p-3.5 rounded-xl border border-border/40 bg-background/50 hover:bg-muted/60 hover:border-emerald-500/30 transition-all duration-300"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground group-hover:text-emerald-500 transition-colors">
                    {item.title}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* 双主操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="lg"
              className="flex-1 rounded-xl border-border/60 hover:bg-muted/70 cursor-pointer"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回上一页
            </Button>
            <Button
              asChild
              size="lg"
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                返回花园首页
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* 底部轻量提示 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1.5"
        >
          <Search className="w-3.5 h-3.5 opacity-60" />
          <span>找不到目标内容？可在页面顶部导航栏中使用全局搜索。</span>
        </motion.p>
      </div>
    </div>
  );
}
