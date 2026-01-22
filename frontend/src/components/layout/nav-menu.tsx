"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuArray } from "@/config/menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Menu,
  ChevronDown,
  Search,
  LogOut,
  Settings,
  UserCircle,
  PenTool,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

/**
 * 🖥️ 桌面端导航菜单
 */
export function DesktopNav() {
  return (
    <NavigationMenu delayDuration={0}>
      <NavigationMenuList className="gap-6">
        {MenuArray.map((menu) => (
          <NavigationMenuItem key={menu.title}>
            {menu.items && menu.items.length > 0 ? (
              <>
                <NavigationMenuTrigger
                  // 彻底禁用点击逻辑，确保只有 Hover 能触发状态
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={(e) => e.preventDefault()}
                  className={cn(
                    "bg-transparent text-sm font-medium transition-colors hover:text-primary",
                    "data-[state=open]:bg-transparent data-[state=open]:text-primary",
                    "focus:bg-transparent focus:text-primary outline-none"
                  )}
                >
                  {menu.title}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    <ListItem
                      key={`${menu.title}-main`}
                      title={`${menu.title} 概览`}
                      href={menu.link}
                      icon={menu.icon}
                    >
                      查看 {menu.title} 的所有内容与完整介绍
                    </ListItem>

                    {menu.items.map((item) => (
                      <ListItem
                        key={item.title}
                        title={item.title}
                        href={item.link}
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
                  href={menu.link}
                  onPointerDown={(e) => e.preventDefault()}
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "bg-transparent transition-colors hover:text-primary active:bg-transparent",
                    "focus:bg-transparent focus:text-primary outline-none"
                  )}
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
    {}
  );
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
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
            <span className="font-mono font-bold">BLOG_FR</span>
          </SheetTitle>
          <SheetDescription className="sr-only">
            博客导航菜单，包含搜索、文章分类及用户设置。
          </SheetDescription>
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
                          openGroups[menu.title] && "rotate-180"
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        "grid gap-1 overflow-hidden transition-all duration-300 ease-in-out",
                        openGroups[menu.title]
                          ? "mt-2 grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      )}
                    >
                      <div className="border-border/40 ml-1.5 flex min-h-0 flex-col gap-1 border-l-2 pl-4">
                        <SheetClose asChild>
                          <Link
                            href={menu.link}
                            className={cn(
                              "hover:bg-accent hover:text-accent-foreground block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                              isActive(menu.link)
                                ? "bg-accent/40 text-primary"
                                : "text-muted-foreground"
                            )}
                          >
                            {menu.title} 概览
                          </Link>
                        </SheetClose>
                        {menu.items.map((item) => (
                          <SheetClose asChild key={item.title}>
                            <Link
                              href={item.link}
                              className={cn(
                                "hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isActive(item.link)
                                  ? "bg-accent/40 text-primary"
                                  : "text-muted-foreground"
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
                  <SheetClose asChild>
                    <Link
                      href={menu.link}
                      className={cn(
                        "hover:text-primary flex items-center gap-2 rounded-md py-2 text-base font-semibold transition-colors",
                        isActive(menu.link) ? "text-primary" : "text-foreground"
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

        <div className="border-t p-4">
          {isLoading ? (
            <div className="flex items-center gap-3 px-2">
              <div className="bg-muted/50 h-10 w-10 animate-pulse rounded-full" />
              <div className="flex flex-col gap-2">
                <div className="bg-muted/50 h-4 w-24 animate-pulse rounded" />
              </div>
            </div>
          ) : user ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 px-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar ?? ""} />
                  <AvatarFallback>{user.username?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">@{user.username}</span>
                </div>
              </div>
              <div className="grid gap-1">
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="justify-start gap-2"
                    asChild
                  >
                    <Link href="/dashboard">
                      <UserCircle className="h-4 w-4" />
                      个人资料
                    </Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="justify-start gap-2"
                    asChild
                  >
                    <Link href="/dashboard">
                      <Settings className="h-4 w-4" />
                      设置
                    </Link>
                  </Button>
                </SheetClose>
                <DropdownMenuSeparator />
                <Button
                  variant="ghost"
                  className="text-destructive w-full justify-start gap-2"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <SheetClose asChild>
                <Link href="/auth/login">
                  <Button className="w-full">登录</Button>
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link href="/auth/register">
                  <Button variant="outline" className="w-full">
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

function ListItem({
  className,
  title,
  children,
  href,
  icon: Icon,
  ...props
}: React.ComponentPropsWithoutRef<"a"> & {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          href={href}
          className={cn(
            "block space-y-1 rounded-md p-3 leading-none no-underline transition-all duration-200 outline-none select-none",
            "hover:bg-accent/50 hover:text-accent-foreground focus:bg-accent/50 focus:text-accent-foreground",
            className
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
