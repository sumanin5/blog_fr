"use client";

import React from "react";
import { AdminSidebar } from "@/components/admin/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();

  // 1. 权限验证中或加载用户信息
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse font-medium">
            获取用户信息...
          </p>
        </div>
      </div>
    );
  }

  // 2. 未登录守卫（middleware 会负责重定向，这里仅做组件保护）
  if (!user) return null;
  // 3. 渲染后台布局
  return (
    <SidebarProvider>
      <div className="flex w-full overflow-hidden bg-background">
        <AdminSidebar className="mt-16" />
        <SidebarInset className="flex flex-col overflow-hidden">
          {/* 可滚动的主内容区域 */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/20">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
