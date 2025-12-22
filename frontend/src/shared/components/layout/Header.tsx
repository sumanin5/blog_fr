import { Link, useNavigate } from "@tanstack/react-router";
import { Sun, Moon, Monitor, PenTool, Search } from "lucide-react";
import { Button } from "@/shared/components/ui-extended";
import { Input } from "@/shared/components/ui/input";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { MobileNav, DesktopNav } from "./NavMenu";
import { useTheme } from "@/features/theme";
import { useAuth } from "@/features/auth";

/**
 * 🏠 页眉组件
 *
 * 特点：
 * 1. 粘性定位 + 毛玻璃效果
 * 2. 响应式设计（移动端侧边栏，桌面端水平导航）
 * 3. 主题切换按钮（支持 dark/light/system）
 * 4. 用户头像下拉菜单
 * 5. 科技风格的导航链接（/HOME 格式）
 */
export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // 获取下一个主题（循环切换：dark -> light -> system -> dark）
  const getNextTheme = () => {
    if (theme === "dark") return "light";
    if (theme === "light") return "system";
    return "dark";
  };

  // 获取主题图标
  const themeIcon =
    theme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : theme === "light" ? (
      <Sun className="h-4 w-4" />
    ) : (
      <Monitor className="h-4 w-4" />
    );

  return (
    <header className="border-border/40 bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ============================================
            移动端导航 (Mobile Nav)
            ============================================ */}
        <div className="md:hidden">
          <MobileNav />
        </div>

        {/* ============================================
            桌面端 Logo + 导航
            ============================================ */}
        <div className="mr-4 hidden items-center gap-8 md:flex">
          {/* Logo - 纯文本展示 */}
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 relative flex h-8 w-8 items-center justify-center rounded-lg">
              <PenTool className="text-primary h-5 w-5" />
            </div>
            <span className="hidden font-mono text-lg font-bold tracking-tight sm:inline-block">
              MY_BLOG
            </span>
          </div>

          {/* 导航链接库 */}
          <DesktopNav />
        </div>

        {/* 移动端 Logo */}
        <div className="flex md:hidden">
          <PenTool className="text-primary mr-2 h-6 w-6" />
          <span className="font-mono font-bold">MY_BLOG</span>
        </div>

        {/* ============================================
            右侧功能区
            ============================================ */}
        <div className="flex items-center gap-2">
          {/* 搜索框 (桌面端) */}
          <div className="hidden sm:flex">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
              <Input
                type="search"
                placeholder="搜索文章..."
                className="w-48 pl-8 lg:w-64"
              />
            </div>
          </div>

          {/* 主题切换按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(getNextTheme())}
            className="rounded-full"
            title={`当前: ${theme === "dark" ? "深色" : theme === "light" ? "浅色" : "跟随系统"}`}
            noTransition
          >
            {themeIcon}
            <span className="sr-only">切换主题</span>
          </Button>

          {/* 用户菜单 */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  data-testid="user-menu-trigger"
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
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/dashboard" })}
                >
                  个人资料
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/dashboard" })}
                >
                  设置
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="logout-button"
                  onClick={logout}
                  className="text-red-500"
                >
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/auth/login">
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  登录
                </Button>
              </Link>
              <Link to="/auth/register">
                <Button size="sm" className="hidden sm:flex">
                  注册
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
