"use client";

import Link from "next/link";
import { PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileNav, DesktopNav } from "./nav-menu";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandMenu } from "@/components/public/common/command-menu";
import { useRouter } from "next/navigation";

/**
 * 🏠 页眉组件 (Next.js 适配版)
 */
export function Header() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-md transition-colors">
      <div className="container mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* 1. 左侧 Logo (自然宽度) */}
        <div className="flex items-center gap-2">
          <div className="md:hidden">
            <MobileNav />
          </div>
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="bg-primary/10 relative flex h-8 w-8 items-center justify-center rounded-lg">
              <PenTool className="text-primary h-5 w-5" />
            </div>
            <span className="hidden font-mono text-lg font-bold tracking-tight sm:inline-block text-nowrap">
              BLOG_FR
            </span>
          </Link>
        </div>

        {/* 2. 中间 导航区域 (占据剩余空间并居中) */}
        <div className="hidden flex-1 items-center justify-center md:flex">
          <DesktopNav />
        </div>

        {/* 3. 右侧 功能区 (自然宽度) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 全局命令与搜索面板 (快捷键 ⌘K / Ctrl+K) */}
          <CommandMenu />

          {/* 主题切换按钮 */}
          <ThemeToggle />

          {/* 用户菜单 */}
          {isLoading ? (
            <div className="bg-muted/50 h-8 w-8 animate-pulse rounded-full" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full transition-transform hover:scale-110"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user.avatar ?? ""}
                      alt={user.username ?? ""}
                    />
                    <AvatarFallback>
                      {user.username?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-mono">
                  @{user.username}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/admin/users")}>
                  个人资料
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/admin/dashboard")}
                >
                  设置
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-red-500"
                >
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              {process.env.NEXT_PUBLIC_SHOW_AUTH_ENTRY === "true" && (
                <>
                  <Link href="/auth/login">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden sm:flex"
                    >
                      登录
                    </Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button size="sm" className="hidden sm:flex">
                      注册
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
