import { Outlet } from "react-router-dom";
import { Header, Footer } from "@/shared/components/layout";
import { Toaster } from "@/shared/components/ui/sonner";
import { ThemeBackground } from "@/shared/components/common/ThemeBackground";

export default function Layout() {
  return (
    <div className="text-foreground relative flex min-h-screen flex-col font-sans antialiased">
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
