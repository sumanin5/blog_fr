import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, Sun, Moon, Monitor, PenTool, Search } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts";

/**
 * 🎯 导航链接配置
 * 集中管理所有导航链接，方便维护
 */
const NAV_LINKS = [
  { path: "/", label: "主页", code: "/HOME" },
  { path: "/blog", label: "博客", code: "/BLOG" },
  { path: "/dashboard", label: "仪表盘", code: "/DASHBOARD" },
  { path: "/about", label: "关于", code: "/ABOUT" },
];

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
  const location = useLocation();
  const navigate = useNavigate();

  // 判断当前路径是否激活
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

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
    <header className="border-border/40 bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur transition-colors duration-300">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ============================================
            移动端导航 (Mobile Nav)
            ============================================ */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">切换导航菜单</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px]">
              <SheetTitle className="sr-only">导航菜单</SheetTitle>
              <SheetDescription className="sr-only">
                网站主要导航链接
              </SheetDescription>

              {/* Logo */}
              <div className="mb-8 flex items-center gap-2">
                <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <PenTool className="text-primary h-5 w-5" />
                </div>
                <span className="font-mono font-bold">MY_BLOG</span>
              </div>

              {/* 导航链接 */}
              <nav className="grid gap-4">
                {NAV_LINKS.map((link) => (
                  <SheetClose asChild key={link.path}>
                    <Link
                      to={link.path}
                      className={`flex items-center gap-2 text-lg transition-all hover:translate-x-2 ${
                        isActive(link.path)
                          ? "text-foreground font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>

              {/* 移动端主题切换 */}
              <div className="mt-8 border-t pt-4">
                <p className="text-muted-foreground mb-2 text-sm">主题设置</p>
                <div className="flex gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="mr-1 h-4 w-4" />
                    浅色
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="mr-1 h-4 w-4" />
                    深色
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("system")}
                  >
                    <Monitor className="mr-1 h-4 w-4" />
                    系统
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* ============================================
            桌面端 Logo + 导航
            ============================================ */}
        <div className="mr-4 hidden items-center gap-8 md:flex">
          {/* Logo - 可点击跳转到首页 */}
          <div
            className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
            onClick={() => navigate("/")}
          >
            <div className="bg-primary/10 relative flex h-8 w-8 items-center justify-center rounded-lg">
              <PenTool className="text-primary h-5 w-5" />
            </div>
            <span className="hidden font-mono text-lg font-bold tracking-tight sm:inline-block">
              MY_BLOG
            </span>
          </div>

          {/* 导航链接 - 科技风格 */}
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  isActive(link.path)
                    ? "text-foreground bg-primary/10"
                    : "text-foreground/60 hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* 移动端 Logo */}
        <div
          className="flex cursor-pointer md:hidden"
          onClick={() => navigate("/")}
        >
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
              <input
                type="search"
                placeholder="搜索文章..."
                className="border-input bg-background/50 focus-visible:border-primary focus-visible:ring-ring flex h-9 w-48 rounded-md border px-3 py-1 pl-8 text-sm shadow-sm transition-all focus-visible:ring-1 focus-visible:outline-none lg:w-64"
              />
            </div>
          </div>

          {/* 主题切换按钮 (桌面端) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(getNextTheme())}
            className="hidden rounded-full md:flex"
            title={`当前: ${theme === "dark" ? "深色" : theme === "light" ? "浅色" : "跟随系统"}`}
          >
            {themeIcon}
            <span className="sr-only">切换主题</span>
          </Button>

          {/* 用户菜单 */}
          {user ? (
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
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  个人资料
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  设置
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-500">
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
                <Button size="sm">注册</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
