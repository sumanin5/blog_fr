import Link from "next/link";
import { Github, Layers, Lightbulb, Compass, Code2 } from "lucide-react";
import { siteConfig } from "@/config/site";
import { FooterEmail } from "./footer-email";

/**
 * 🦶 页脚组件 - 数字花园全栈极客现代多栏设计
 *
 * 核心升级：
 * 1. 移除生硬背景色块，无缝继承全局通透背景；
 * 2. 顶部微光渐变过渡，告别死白割裂；
 * 3. 4 栏丰富排版，消除中间大面积空白，饱满高级；
 * 4. 嵌入系统健康状态脉冲灯与全栈技术致敬。
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-24 border-t border-border/40">
      {/* 顶部微弱翡翠渐变流光线 */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent pointer-events-none" />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-18">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* 第 1 栏：品牌愿景与系统状态 (占 5 列) */}
          <div className="lg:col-span-5 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>BLOG_FR</span>
            </Link>

            <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed max-w-sm font-light">
              在混乱的数字世界中构建优雅的解决方案。
              以体系化专栏沉淀工程深度，以敏捷随笔捕捉即时灵感。
            </p>

            {/* 极客风系统运行状态微徽章 */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono border border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>System Operational · 数字花园生长中</span>
              </div>
            </div>
          </div>

          {/* 第 2 栏：专栏合集 (占 2 列) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-foreground">
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>专栏合集</span>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <Link
                  href="/posts/articles/categories/system-design"
                  className="hover:text-foreground transition-colors"
                >
                  系统设计
                </Link>
              </li>
              <li>
                <Link
                  href="/posts/articles/categories/frontend-engineering"
                  className="hover:text-foreground transition-colors"
                >
                  前端工程
                </Link>
              </li>
              <li>
                <Link
                  href="/posts/articles/categories/devops-practice"
                  className="hover:text-foreground transition-colors"
                >
                  工程实践
                </Link>
              </li>
              <li>
                <Link
                  href="/posts/articles/categories"
                  className="hover:text-foreground transition-colors text-emerald-600 dark:text-emerald-400 font-medium"
                >
                  全部分类 →
                </Link>
              </li>
            </ul>
          </div>

          {/* 第 3 栏：快速漫游 (占 2 列) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-foreground">
              <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>漫游</span>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <Link
                  href="/posts/articles"
                  className="hover:text-foreground transition-colors"
                >
                  精选长文
                </Link>
              </li>
              <li>
                <Link
                  href="/posts/ideas"
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <span>即时想法</span>
                  <Lightbulb className="w-3 h-3 text-amber-500" />
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="hover:text-foreground transition-colors"
                >
                  关于本站
                </Link>
              </li>
              <li>
                <Link
                  href="/search"
                  className="hover:text-foreground transition-colors"
                >
                  搜索内容
                </Link>
              </li>
            </ul>
          </div>

          {/* 第 4 栏：技术栈致敬与连接 (占 3 列) */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-foreground">
              <Code2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>架构与连接</span>
            </div>

            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              Powered by <span className="text-foreground">Next.js 16</span>,{" "}
              <span className="text-foreground">FastAPI</span> &{" "}
              <span className="text-foreground">Tailwind CSS</span>.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg border border-border/60 bg-background/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <FooterEmail />
            </div>
          </div>
        </div>

        {/* 底栏版权与极客宣言 */}
        <div className="mt-12 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <div>
            © {currentYear} BLOG_FR · Crafted by tomy. All rights reserved.
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <span>Digital Garden Philosophy</span>
            <span className="text-emerald-500">🌱</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
