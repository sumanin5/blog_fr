import { Outlet } from "react-router-dom";
import { Header, Footer } from "@/shared/components/layout";
import { Toaster } from "@/shared/components/ui/sonner";
import { ThemeBackground } from "@/shared/components/common/ThemeBackground";

/**
 * 🏗️ 主布局组件
 *
 * 职责：
 * 1. 提供整体页面结构（Header + Main + Footer）
 * 2. 确保页脚始终在底部（flex 布局）
 * 3. 添加主题背景（通过 ThemeBackground 组件）
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
    <div className="text-foreground relative flex min-h-screen flex-col font-sans antialiased transition-colors duration-300">
      {/* 主题背景 */}
      <ThemeBackground />

      {/* 页眉 */}
      <Header />

      {/* 主内容区域 */}
      <main className="relative flex flex-1 flex-col">
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
