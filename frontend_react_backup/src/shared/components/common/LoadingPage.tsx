import { Loader2, Sparkles } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

interface LoadingPageProps {
  message?: string;
  fullPage?: boolean;
  showBrand?: boolean;
}

/**
 * 🎨 专业级加载页面组件
 *
 * 特点：
 * - 玻璃形态设计 (Glassmorphism)
 * - 多层次动画效果
 * - 响应式布局
 * - 品牌元素集成
 */
export function LoadingPage({
  message = "正在加载精彩内容",
  fullPage = true,
  showBrand = true,
}: LoadingPageProps) {
  return (
    <div
      className={cn(
        "from-background via-background to-muted/20 flex items-center justify-center bg-linear-to-br backdrop-blur-xl",
        fullPage
          ? "fixed inset-0 z-100 h-screen w-screen"
          : "min-h-[400px] w-full",
      )}
    >
      {/* 装饰性背景网格 */}
      <div className="bg-grid-white/[0.02] absolute inset-0 bg-size-[50px_50px]" />

      {/* 装饰性光晕 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="bg-primary/5 h-[400px] w-[400px] animate-pulse rounded-full blur-3xl" />
      </div>

      {/* 主内容卡片 */}
      <Card className="border-border/50 bg-card/80 relative z-10 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col items-center gap-6 p-8">
          {/* 品牌标识区域 */}
          {showBrand && (
            <div className="flex items-center gap-2">
              <Sparkles className="text-primary h-5 w-5 animate-pulse" />
              <span className="from-primary to-primary/60 bg-linear-to-r bg-clip-text text-lg font-bold tracking-tight text-transparent">
                博客系统
              </span>
            </div>
          )}

          {/* 核心加载动画区域 */}
          <div className="relative flex h-24 w-24 items-center justify-center">
            {/* 外层装饰环 */}
            <div className="border-primary/10 absolute inset-0 rounded-full border-4" />

            {/* 旋转的渐变环 - 慢速 */}
            <div className="border-t-primary/40 border-r-primary/40 absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border-4 border-transparent" />

            {/* 旋转的实线环 - 快速 */}
            <div className="border-t-primary absolute inset-2 animate-spin rounded-full border-4 border-transparent" />

            {/* 中心图标 */}
            <Loader2
              className="text-primary h-8 w-8 animate-spin"
              strokeWidth={2.5}
            />
          </div>

          {/* 文本信息区域 */}
          <div className="flex flex-col items-center gap-3">
            {/* 主提示文字 */}
            <p className="text-foreground/80 text-sm font-medium">{message}</p>

            {/* 状态徽章 */}
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary hover:bg-primary/20 animate-pulse"
            >
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
                  <span className="bg-primary relative inline-flex h-2 w-2 rounded-full"></span>
                </span>
                加载中
              </span>
            </Badge>

            {/* 装饰性进度指示器 */}
            <div className="bg-muted relative mt-2 h-1 w-32 overflow-hidden rounded-full">
              <div className="via-primary absolute inset-0 animate-[loading-slide_1.5s_infinite_ease-in-out] bg-linear-to-r from-transparent to-transparent" />
            </div>
          </div>
        </div>
      </Card>

      {/* 底部提示文字（仅全屏模式） */}
      {fullPage && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <p className="text-muted-foreground/60 animate-pulse text-xs">
            正在为您准备最佳体验
          </p>
        </div>
      )}
    </div>
  );
}
