import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Github,
  ExternalLink,
  Download,
  Cpu,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { getProductBySlug } from "@/config/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProjectPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return { title: "项目未找到 · 数字花园" };
  }

  return {
    title: `${product.name} — ${product.tagline} · 产品落地页`,
    description: product.summary,
    openGraph: {
      title: `${product.name} — ${product.tagline}`,
      description: product.summary,
      type: "website",
    },
  };
}

export default async function ProductDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="relative min-h-screen">
      <main className="relative z-10 container mx-auto px-4 md:px-6 pt-20 pb-32 max-w-5xl">
        {/* 顶部返回面包屑 */}
        <div className="mb-8">
          <Link
            href={"/projects" as Route}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-emerald-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回精选项目矩阵</span>
          </Link>
        </div>

        {/* 1. Hero 展台区 */}
        <section className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-medium border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-6 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{product.badge}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground mb-6 leading-tight">
            {product.name}
            <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-500 via-teal-400 to-cyan-500">
              {product.tagline}
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8">
            {product.description}
          </p>

          {/* 行动按钮群 (CTA) */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {product.demoUrl && (
              <a
                href={product.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/25 px-8 cursor-pointer h-12"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  <span>立即体验 Web 版</span>
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
                size="lg"
                className="rounded-xl border-border/60 hover:bg-muted font-medium px-6 cursor-pointer h-12"
              >
                <Github className="w-4 h-4 mr-2" />
                <span>Star on GitHub</span>
              </Button>
            </a>

            {product.vscodeUrl && (
              <a
                href={product.vscodeUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-xl border-border/60 hover:bg-muted font-medium px-6 cursor-pointer h-12"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span>VS Code 扩展市场</span>
                </Button>
              </a>
            )}
          </div>
        </section>

        {/* 2. 模拟真实 macOS 编辑器交互视窗 (Interactive Showcase Window) */}
        <section className="mb-24">
          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-2xl shadow-2xl overflow-hidden">
            {/* 视窗顶栏 (macOS 控制红黄绿红灯) */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                Inkdown · WYSIWYG Modern Editor
              </span>
              <div className="w-12" />
            </div>

            {/* 编辑视窗内容 (所见即所得演示展示) */}
            <div className="p-6 sm:p-10 font-mono text-xs sm:text-sm leading-relaxed space-y-6">
              <div className="border-b border-border/30 pb-4">
                <span className="text-muted-foreground font-mono">{"// 所见即所得：输入时光标感知语法，实时转化为沉浸排版"}</span>
                <div className="mt-2 text-2xl font-bold text-foreground font-sans">
                  # 纯粹的思考，无需受困于排版符号
                </div>
              </div>

              <div className="space-y-3 font-sans text-foreground/85 text-sm sm:text-base">
                <p>
                  传统的 Markdown 编辑器往往强迫你在“左边源码、右边预览”之间频繁撕裂视线。
                  在 <strong className="text-emerald-500">Inkdown</strong> 中，每一次击键都在平滑的画布上自然流淌。
                </p>

                <div className="p-4 rounded-xl bg-background/60 border border-emerald-500/20 font-mono text-xs sm:text-sm space-y-2">
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ 原生支持丰富的工程生态表达：
                  </div>
                  <div className="text-muted-foreground">
                    • 100% GFM 语法高亮与复选任务列表<br />
                    • KaTeX 科学公式推导：$E = mc^2$<br />
                    • Mermaid 复杂系统架构图渲染
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. 核心特性矩阵 (Feature Matrix) */}
        <section className="mb-24">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              为专注而生的核心特性
            </h2>
            <p className="text-sm text-muted-foreground">
              摒弃一切冗杂装饰，保留最纯粹的输入直觉与排版体验。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {product.features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 sm:p-8 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl hover:border-emerald-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span className="text-3xl p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    {feature.icon}
                  </span>
                  {feature.badge && (
                    <Badge
                      variant="outline"
                      className="text-xs font-mono px-2.5 py-0.5 rounded-full border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    >
                      {feature.badge}
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. 极客工程哲学与指标 */}
        <section className="mb-20 p-8 sm:p-10 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center divide-y sm:divide-y-0 sm:divide-x divide-border/30">
            <div className="space-y-2 pt-4 sm:pt-0">
              <Zap className="w-6 h-6 text-emerald-500 mx-auto" />
              <div className="text-xl font-bold text-foreground">本地优先架构</div>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                基于浏览器沙盒与持久缓存，数据零上传，拥有绝对私密控制权。
              </p>
            </div>
            <div className="space-y-2 pt-4 sm:pt-0">
              <Cpu className="w-6 h-6 text-teal-500 mx-auto" />
              <div className="text-xl font-bold text-foreground">极小运行时体积</div>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                无任何臃肿框架开销，极速渲染大型 Markdown 技术长卷。
              </p>
            </div>
            <div className="space-y-2 pt-4 sm:pt-0">
              <ShieldCheck className="w-6 h-6 text-cyan-500 mx-auto" />
              <div className="text-xl font-bold text-foreground">开源与透明</div>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                代码完全开源，在 GitHub 上公开透明演进，拥抱社区贡献。
              </p>
            </div>
          </div>
        </section>

        {/* 5. 底部收官 CTA */}
        <section className="text-center p-8 sm:p-12 rounded-3xl border border-emerald-500/30 bg-linear-to-b from-emerald-500/10 via-card/40 to-card/60 backdrop-blur-2xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-4">
            开启纯粹从容的 Markdown 创作之旅
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8">
            无需复杂的注册或安装门槛，即刻在浏览器中体验或接入你的 VS Code 工作流。
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {product.demoUrl && (
              <a
                href={product.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 cursor-pointer h-12 shadow-lg shadow-emerald-600/20"
                >
                  <span>立即启动 Inkdown</span>
                  <ExternalLink className="w-4 h-4 ml-2" />
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
                size="lg"
                className="rounded-xl border-border/60 hover:bg-muted font-medium px-6 cursor-pointer h-12"
              >
                <Github className="w-4 h-4 mr-2" />
                <span>在 GitHub 上关注</span>
              </Button>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
