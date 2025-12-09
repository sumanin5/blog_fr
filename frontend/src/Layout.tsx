import { Outlet } from "react-router-dom";
import { Header, Footer } from "@/components/layout";
import { Toaster } from "@/components/ui/sonner";

/**
 * 🏗️ 主布局组件
 *
 * 职责：
 * 1. 提供整体页面结构（Header + Main + Footer）
 * 2. 确保页脚始终在底部（flex 布局）
 * 3. 添加科技感背景渐变
 * 4. 集成 Toast 通知系统
 *
 * 结构：
 * ┌─────────────────────────────┐
 * │         Header              │  ← 粘性定位，始终在顶部
 * ├─────────────────────────────┤
 * │                             │
 * │         Main                │  ← flex-1，占据剩余空间
 * │       (Outlet)              │
 * │                             │
 * ├─────────────────────────────┤
 * │         Footer              │  ← 始终在底部
 * └─────────────────────────────┘
 */
export default function Layout() {
  return (
    <div className="bg-background flex min-h-screen flex-col font-sans antialiased text-foreground transition-colors duration-300">
      {/* 页眉 */}
      <Header />

      {/* 主内容区域 */}
      <main className="relative flex flex-1 flex-col">
        {/*
          🎨 科技感背景渐变
          - 从左下到右上的渐变
          - 使用主题色的 5% 透明度
          - 不阻挡鼠标事件
        */}
        <div className="absolute inset-0 bg-linear-to-tr from-primary/5 via-transparent to-secondary/5 pointer-events-none -z-10" />

        {/* 页面内容（由路由决定） */}
        <Outlet />
      </main>

      {/* 页脚 */}
      <Footer />

      {/* Toast 通知组件 */}
      <Toaster />
    </div>
  );
}
