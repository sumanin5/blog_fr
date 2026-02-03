"use client";

import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

// Components from the new sub-directory
import { SidebarHeaderSection } from "./sidebar/sidebar-header-section";
import { SidebarUserFooter } from "./sidebar/sidebar-user-footer";

// Utils
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  ShieldCheck,
  FolderTree,
  Tags,
  Image as ImageIcon,
  Users,
} from "lucide-react";

const SIDEBAR_CONFIG = {
  personal: [
    { icon: FileText, label: "博文管理", href: "/admin/posts" },
    { icon: GitBranch, label: "同步状态", href: "/admin/sync" },
  ],
  admin: [
    { icon: LayoutDashboard, label: "数据中台", href: "/admin/dashboard" }, // 工作台 -> 数据中台
    { icon: Users, label: "用户管理", href: "/admin/users" },
    { icon: ShieldCheck, label: "全站内容", href: "/admin/posts/all" },
    { icon: FolderTree, label: "分类运维", href: "/admin/categories" },
    { icon: Tags, label: "标签治理", href: "/admin/tags" },
    { icon: ImageIcon, label: "媒体管理", href: "/admin/media" },
  ],
};

export function AdminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarHeaderSection />
      </SidebarHeader>

      <SidebarContent>
        {/* 段落 1: 个人管理 */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Personal Space
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SIDEBAR_CONFIG.personal.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <Link href={item.href as any}>
                      <item.icon className="size-4" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 段落 2: 管理员特权 */}
        {(user.role === "superadmin" || user.role === "admin") && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Admin Control
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {SIDEBAR_CONFIG.admin.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href as any}>
                        <item.icon className="size-4" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarUserFooter user={user} logout={logout} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
