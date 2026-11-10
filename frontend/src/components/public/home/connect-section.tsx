"use client";

import Link from "next/link";
import { Github, ArrowRight, Sparkles, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { FooterEmail } from "@/components/public/layout/footer-email";
import { motion } from "framer-motion";

/**
 * 👑 首页末尾专属内容模块 (Connect & Garden Philosophy Showcase)
 *
 * 核心设计：
 * 1. 彻底取代老旧的多栏链接堆砌页脚；
 * 2. 采用现代磨砂玻璃大展台，作为数字花园的自然收官章节；
 * 3. 融合思想理念与实用连接操作（GitHub、邮件、分类漫游）。
 */
export function ConnectSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card/60 via-card/30 to-muted/20 backdrop-blur-xl p-8 sm:p-12 lg:p-14 shadow-xl shadow-emerald-950/5"
    >
      {/* 背景柔和翡翠微光斑 */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* 左侧：理念与对话邀请 (占 7 列) */}
        <div className="lg:col-span-7 space-y-4 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>交流 · 探讨 · 开源连接</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            在混乱的数字世界中，<br />
            构建优雅长青的解决方案。
          </h2>

          <p className="text-muted-foreground text-sm sm:text-base font-light leading-relaxed max-w-xl">
            这里记录了全栈工程的深度推演与灵感随笔。无论是架构设计探讨、前端工程演进还是开源合作，欢迎随时开启对话。
          </p>

          {/* 实时状态微光 */}
          <div className="pt-2 flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Digital Garden Operational · 思想花园持续生长中 🌱</span>
          </div>
        </div>

        {/* 右侧：行动按钮与交互区 (占 5 列) */}
        <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-3.5 justify-center lg:items-end">
          <Link href="/posts/articles/categories" className="w-full sm:w-auto lg:w-full">
            <Button
              size="lg"
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-black font-semibold shadow-md shadow-emerald-600/15 group justify-between px-6"
            >
              <span className="flex items-center gap-2">
                <Compass className="w-4 h-4" />
                <span>漫游全部专栏合集</span>
              </span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>

          <div className="flex items-center gap-3 w-full sm:w-auto lg:w-full">
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button
                variant="outline"
                size="lg"
                className="w-full h-12 rounded-xl bg-background/50 backdrop-blur-md hover:bg-muted border-border/60 text-xs sm:text-sm font-medium"
              >
                <Github className="mr-2 w-4 h-4" />
                <span>GitHub 源码</span>
              </Button>
            </a>

            <div className="shrink-0 flex items-center">
              <FooterEmail />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
