"use client";

import Link from "next/link";
import { Terminal, BookOpen, PenTool, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative w-full min-h-[85vh] flex flex-col items-center justify-center overflow-hidden border-b border-border/40">
      {/* Background Image & Effects */}
      <div className="absolute inset-0 z-0">
        {/* Gradient Overlay */}
        <div className="absolute inset-0" />
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-size-[32px_32px] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 container px-4 md:px-6 flex flex-col items-center text-center space-y-10 pt-20">
        <div className="space-y-6 max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-1000 fill-mode-backwards">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-mono text-primary backdrop-blur-sm mb-4">
            <Terminal className="mr-2 h-3.5 w-3.5" />
            <span>Hello, World. 欢迎来到我的数字花园。</span>
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl bg-clip-text text-transparent bg-linear-to-b from-foreground to-foreground/50 drop-shadow-sm">
            Code, Thoughts <br className="hidden md:block" /> & Creation
          </h1>

          <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl leading-relaxed font-light">
            在混乱的数字世界中构建优雅的解决方案。
            <br className="hidden sm:block" />
            这里记录了深度的技术探讨与深夜的灵感瞬间。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-5 w-full justify-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 fill-mode-backwards">
          <Link href="/posts/articles/categories">
            <Button
              size="lg"
              className="w-full sm:w-auto min-w-[160px] text-base h-12 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              <BookOpen className="mr-2 w-5 h-5" /> 阅读文章
            </Button>
          </Link>
          <Link href="/posts/ideas/categories">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto min-w-[160px] text-base h-12 bg-background/50 backdrop-blur-sm hover:bg-background/80"
            >
              <PenTool className="mr-2 w-5 h-5" /> 查看想法
            </Button>
          </Link>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
        <ArrowRight className="h-6 w-6 rotate-90" />
      </div>
    </section>
  );
}
