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
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container flex h-14 max-w-screen-2xl items-center mx-auto px-4">
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
              <div className="flex items-center gap-2 mb-8">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <PenTool className="h-5 w-5 text-primary" />
                </div>
                <span className="font-bold font-mono">MY_BLOG</span>
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
              <div className="mt-8 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">主题设置</p>
                <div className="flex gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-4 w-4 mr-1" />
                    浅色
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-4 w-4 mr-1" />
                    深色
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("system")}
                  >
                    <Monitor className="h-4 w-4 mr-1" />
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
        <div className="mr-4 hidden md:flex items-center">
          {/* Logo - 可点击跳转到首页 */}
          <div
            className="mr-6 flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <PenTool className="h-5 w-5 text-primary" />
            </div>
            <span className="hidden font-bold sm:inline-block tracking-tight font-mono">
              MY_BLOG
            </span>
          </div>

          {/* 导航链接 - 科技风格 */}
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`transition-colors hover:text-primary font-mono ${
                  isActive(link.path)
                    ? "text-foreground font-bold"
                    : "text-foreground/60"
                }`}
              >
                {link.code}
              </Link>
            ))}
          </nav>
        </div>

        {/* 移动端 Logo */}
        <div
          className="flex md:hidden cursor-pointer"
          onClick={() => navigate("/")}
        >
          <PenTool className="h-6 w-6 mr-2 text-primary" />
          <span className="font-bold font-mono">MY_BLOG</span>
        </div>

        {/* ============================================
            右侧功能区
            ============================================ */}
        <div className="flex flex-1 items-center justify-end space-x-2">
          {/* 搜索框 (桌面端) */}
          <div className="hidden sm:block">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="搜索..."
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:w-48 lg:w-64"
              />
            </div>
          </div>

          {/* 主题切换按钮 (桌面端) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(getNextTheme())}
            className="hidden md:flex"
            title={`当前: ${theme === "dark" ? "深色" : theme === "light" ? "浅色" : "跟随系统"}`}
          >
            {themeIcon}
            <span className="sr-only">切换主题</span>
          </Button>

          {/* 分隔线 */}
          <div className="mx-2 h-4 w-px bg-border/50 hidden md:block" />

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
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  登录
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">注册</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
