"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  // 未登录时自动跳转（使用 useEffect 避免在渲染期间调用 router.push）
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login?callbackUrl=/admin/dashboard");
    }
  }, [user, isLoading, router]);

  // 1. 加载中状态
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse font-medium">
            验证权限中...
          </p>
        </div>
      </div>
    );
  }

  // 2. 未登录守卫（显示加载状态，useEffect 会处理跳转）
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse font-medium">
            跳转到登录页...
          </p>
        </div>
      </div>
    );
  }

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
