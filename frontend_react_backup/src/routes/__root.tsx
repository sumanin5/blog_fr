// src/routes/__root.tsx
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Header, Footer } from "@/shared/components/layout";
import { Toaster } from "@/shared/components/ui/sonner";
import { ThemeBackground } from "@/shared/components/common/ThemeBackground";
import { QueryClient } from "@tanstack/react-query";

interface MyRouterContext {
  queryClient: QueryClient;
  auth: any; // 或者更具体的 AuthContext 类型
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <div className="text-foreground relative flex min-h-screen flex-col font-sans antialiased">
      <ThemeBackground />
      <Header />

      <main className="relative flex flex-1 flex-col">
        {/* 用 TanStack 的 Outlet 替换 react-router-dom 的 */}
        <Outlet />
      </main>

      <Footer />
      <Toaster />

      {/* 这是一个非常好用的调试工具，生产环境会自动 tree-shake 掉 */}
      <TanStackRouterDevtools />
    </div>
  ),
});
