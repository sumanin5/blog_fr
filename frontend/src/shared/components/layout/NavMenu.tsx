import * as React from "react";
import { MenuArray } from "./MenuArray";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/shared/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui-extended";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { cn } from "@/shared/lib/utils";
import { type FileRouteTypes } from "@/routeTree.gen";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Menu,
  ChevronDown,
  Search,
  LogOut,
  Settings,
  UserCircle,
  PenTool,
} from "lucide-react";
import { useAuth } from "@/features/auth";

import { Input } from "@/shared/components/ui/input";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { DropdownMenuSeparator } from "@/shared/components/ui/dropdown-menu";

/**
 * 🖥️ 桌面端导航菜单
 */
export function DesktopNav() {
  return (
    <NavigationMenu>
      <NavigationMenuList className="gap-2">
        {MenuArray.map((menu) => (
          <NavigationMenuItem key={menu.title}>
            {menu.items && menu.items.length > 0 ? (
              <>
                <NavigationMenuTrigger className="hover:text-primary focus:text-primary text-sm font-medium transition-colors">
                  {menu.title}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    {/* 父级概览项 */}
                    <ListItem
                      key={`${menu.title}-main`}
                      title={`${menu.title} 概览`}
                      to={menu.link}
                      icon={menu.icon}
                    >
                      查看 {menu.title} 的所有内容与完整介绍
                    </ListItem>

                    {/* 子菜单项 */}
                    {menu.items.map((item) => (
                      <ListItem
                        key={item.title}
                        title={item.title}
                        to={item.link}
                        icon={item.icon}
                      >
                        {item.description}
                      </ListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </>
            ) : (
              <NavigationMenuLink asChild>
                <Link
                  to={menu.link}
                  className={cn(navigationMenuTriggerStyle(), "bg-transparent")}
                >
                  {menu.title}
                </Link>
              </NavigationMenuLink>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

/**
 * 📱 移动端导航菜单 (带折叠动效)
 */
export function MobileNav() {
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    {},
  );
  const { location } = useRouterState();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // 简单的状态切换函数
  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">切换导航菜单</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex h-full w-[300px] flex-col p-0 sm:w-[400px]"
      >
        <SheetHeader className="space-y-4 p-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
              <PenTool className="text-primary h-5 w-5" />
            </div>
            <span className="font-mono font-bold">MY_BLOG</span>
          </SheetTitle>
          <SheetDescription className="sr-only">
            博客导航菜单，包含搜索、文章分类及用户设置。
          </SheetDescription>
          {/* 顶部搜索框 */}
          <div className="relative w-full">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
            <Input
              type="search"
              placeholder="搜索文章..."
              className="bg-muted/50 h-10 w-full pl-9"
            />
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="flex flex-col gap-6 pb-10">
            {MenuArray.map((menu) => (
              <div key={menu.title} className="flex flex-col gap-2">
                {menu.items && menu.items.length > 0 ? (
                  /* 情况A: 有子菜单，渲染折叠面板 */
                  <div className="border-border/40 border-b pb-4 last:border-0">
                    <button
                      onClick={() => toggleGroup(menu.title)}
                      className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between py-2 text-sm font-semibold tracking-widest uppercase transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        {menu.icon && <menu.icon className="h-4 w-4" />}
                        {menu.title}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          openGroups[menu.title] && "rotate-180",
                        )}
                      />
                    </button>

                    {/* 折叠内容区 */}
                    <div
                      className={cn(
                        "grid gap-1 overflow-hidden transition-all duration-300 ease-in-out",
                        openGroups[menu.title]
                          ? "mt-2 grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="border-border/40 ml-1.5 flex min-h-0 flex-col gap-1 border-l-2 pl-4">
                        {/* 父级入口 */}
                        <SheetClose asChild>
                          <Link
                            to={menu.link}
                            className={cn(
                              "hover:bg-accent hover:text-accent-foreground block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                              isActive(menu.link)
                                ? "bg-accent/40 text-primary"
                                : "text-muted-foreground",
                            )}
                          >
                            {menu.title} 概览
                          </Link>
                        </SheetClose>
                        {/* 子项列表 */}
                        {menu.items.map((item) => (
                          <SheetClose asChild key={item.title}>
                            <Link
                              to={item.link}
                              className={cn(
                                "hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isActive(item.link)
                                  ? "bg-accent/40 text-primary"
                                  : "text-muted-foreground",
                              )}
                            >
                              {item.icon && (
                                <item.icon className="h-3.5 w-3.5 opacity-70" />
                              )}
                              {item.title}
                            </Link>
                          </SheetClose>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 情况B: 无子菜单，直接渲染链接 */
                  <SheetClose asChild>
                    <Link
                      to={menu.link}
                      className={cn(
                        "hover:text-primary flex items-center gap-2 rounded-md py-2 text-base font-semibold transition-colors",
                        isActive(menu.link)
                          ? "text-primary"
                          : "text-foreground",
                      )}
                    >
                      {menu.icon && <menu.icon className="h-5 w-5" />}
                      {menu.title}
                    </Link>
                  </SheetClose>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* 底部用户区域 */}
        <div className="border-t p-4">
          {user ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 px-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={user.avatar ?? ""}
                    alt={user.username ?? ""}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user.username?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">@{user.username}</span>
                  <span className="text-muted-foreground text-xs">
                    {user.email || "已登录用户"}
                  </span>
                </div>
              </div>
              <div className="grid gap-1">
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => navigate({ to: "/dashboard" })}
                  >
                    <UserCircle className="h-4 w-4" />
                    个人资料
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => navigate({ to: "/dashboard" })}
                  >
                    <Settings className="h-4 w-4" />
                    设置
                  </Button>
                </SheetClose>
                <DropdownMenuSeparator />
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-start gap-2"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </Button>
                </SheetClose>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <SheetClose asChild>
                <Link to="/auth/login" className="w-full">
                  <Button className="w-full" size="lg">
                    登录
                  </Button>
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/auth/register" className="w-full">
                  <Button variant="outline" className="w-full" size="lg">
                    注册
                  </Button>
                </Link>
              </SheetClose>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// 辅助组件：桌面端列表项
function ListItem({
  className,
  title,
  children,
  to,
  icon: Icon,
  ...props
}: Omit<React.ComponentPropsWithoutRef<typeof Link>, "to" | "children"> & {
  title: string;
  to: FileRouteTypes["to"];
  icon?: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
}) {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          to={to}
          className={cn(
            "block space-y-1 rounded-md p-3 leading-none no-underline transition-all duration-200 outline-none select-none",
            "hover:bg-accent/50 hover:text-accent-foreground focus:bg-accent/50 focus:text-accent-foreground",
            className,
          )}
          {...props}
        >
          <div className="flex items-center gap-2">
            {Icon && <Icon className="text-primary/80 h-4 w-4" />}
            <div className="text-sm leading-none font-semibold">{title}</div>
          </div>
          <p className="text-muted-foreground mt-1.5 ml-0.5 line-clamp-2 text-xs leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}
