"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// 客户端按需异步加载 3D 场景，保证 SSR 纯净与首屏秒开
const DigitalGarden3D = dynamic(
  () => import("@/components/public/home/digital-garden-3d"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[360px] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      </div>
    ),
  }
);

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden border-b border-border/40 py-12 md:py-18 lg:py-22">
      {/* 顶部柔和环境光晕 */}
      <div className="absolute top-10 right-1/4 w-[500px] h-[350px] bg-emerald-500/10 dark:bg-emerald-500/15 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* 左侧文字与操作区 (占 7 列) */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="lg:col-span-7 space-y-6 text-left"
          >
            {/* 顶栏微小徽标 / Slogan */}
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs md:text-sm font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span>记录技术思考，构建更好的数字花园</span>
            </div>

            {/* 核心主标题：代码之外，思考之中。 */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              代码之外，
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">
                思考之中。
              </span>
            </h1>

            {/* 副标题文案 */}
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-xl font-light">
              在混乱的数字世界中构建优雅的解决方案。
              <br className="hidden sm:inline" />
              这里记录了深度的技术探讨与深夜的灵感瞬间。
            </p>

            {/* 行动按钮 */}
            <div className="pt-2 flex items-center gap-4">
              <Link href="/posts/articles/categories">
                <Button
                  size="lg"
                  className="h-12 px-7 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-black font-semibold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 group"
                >
                  <BookOpen className="mr-2 w-4 h-4 transition-transform group-hover:scale-110" />
                  阅读文章
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* 右侧：实时原生 3D 展台区 (占 5 列，支持鼠标跟随与平滑微动) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            className="lg:col-span-5 relative flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[480px] aspect-[4/3] rounded-3xl overflow-hidden border border-border/50 bg-card/25 backdrop-blur-md shadow-2xl shadow-emerald-950/10 group">
              {/* 实时原生 3D WebGL 视口 */}
              <DigitalGarden3D />

              {/* 底部柔和边缘羽化渐变，自然沉入背景 */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/40 to-transparent pointer-events-none" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
