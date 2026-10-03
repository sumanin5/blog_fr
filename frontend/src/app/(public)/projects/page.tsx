import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Github, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/public/common/page-header";
import { TiltCard } from "@/components/ui/tilt-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRODUCTS } from "@/config/products";

export const metadata = {
  title: "精选项目与产品矩阵 · 数字花园",
  description: "探索独立孵化与开源的现代工具与软件解决方案，聚焦开发效率与纯粹体验。",
};

export default function ProjectsPage() {
  return (
    <div className="relative min-h-screen">
      <main className="relative z-10 container mx-auto px-4 md:px-6 pt-24 pb-32">
        {/* 页面标题 */}
        <section className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <PageHeader
            tagline="Open Source & Craft · 独立工坊"
            title="精选开源与"
            subtitle="产品矩阵"
            description="这里汇聚了由博主独立孵化或主导的核心工具与解决方案。每一款产品均聚焦于解决特定维度的真实痛点，在工程稳固与交互美学之间追求极致平衡。"
          />
        </section>

        {/* 产品矩阵展示网格 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {PRODUCTS.map((product) => (
            <TiltCard
              key={product.slug}
              className="h-full rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl p-6 sm:p-8 flex flex-col justify-between shadow-xl hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/5 transition-all"
            >
              <div>
                {/* 顶栏：图标 + 状态微光 */}
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl sm:text-4xl p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      {product.icon}
                    </span>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        {product.name}
                      </h2>
                      <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                        {product.badge}
                      </p>
                    </div>
                  </div>

                  {/* 状态呼吸灯 */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{product.statusText}</span>
                  </div>
                </div>

                {/* 标语与摘要 */}
                <h3 className="text-base sm:text-lg font-semibold text-foreground/90 mb-3">
                  {product.tagline}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {product.summary}
                </p>

                {/* 核心指标微徽章 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 p-3 rounded-xl bg-background/50 border border-border/30">
                  {product.metrics.map((metric) => (
                    <div key={metric.label} className="text-center">
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {metric.label}
                      </div>
                      <div className="text-xs font-semibold text-foreground mt-0.5 truncate">
                        {metric.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 技术栈标签 */}
                <div className="flex flex-wrap gap-1.5 mb-8">
                  {product.techStack.map((tech) => (
                    <Badge
                      key={tech}
                      variant="outline"
                      className="text-[11px] px-2 py-0.5 rounded-md border-border/40 bg-muted/30 text-muted-foreground"
                    >
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 底栏行动按钮 (CTA) */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/30">
                <Link
                  href={`/projects/${product.slug}` as Route}
                  className="flex-1 min-w-[140px]"
                >
                  <Button
                    size="default"
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-600/15 group justify-between cursor-pointer"
                  >
                    <span>探索专属落地页</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>

                {product.demoUrl && (
                  <a
                    href={product.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="default"
                      className="rounded-xl border-border/60 hover:bg-muted cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 mr-1.5" />
                      <span>体验</span>
                    </Button>
                  </a>
                )}

                <a
                  href={product.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    size="default"
                    className="rounded-xl border-border/60 hover:bg-muted cursor-pointer"
                  >
                    <Github className="w-4 h-4 mr-1.5" />
                    <span>源码</span>
                  </Button>
                </a>
              </div>
            </TiltCard>
          ))}
        </div>
      </main>
    </div>
  );
}
