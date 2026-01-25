"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import React from "react";

// 映射表：将 URL 路径翻译成中文或更友好的标题
const routeMap: Record<string, string> = {
  admin: "后台管理",
  posts: "文章管理",
  categories: "分类运维",
  tags: "标签治理",
  users: "用户管理",
  dashboard: "工作台",
  settings: "系统设置",
  media: "媒体管理",
};

export function AdminHeader() {
  const pathname = usePathname();

  // 将路径拆分为数组，并过滤掉空值
  // 例如：/admin/posts/tags -> ["admin", "posts", "tags"]
  const pathSegments = pathname.split("/").filter(Boolean);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />

        <Breadcrumb>
          <BreadcrumbList>
            {pathSegments.map((segment, index) => {
              const isLast = index === pathSegments.length - 1;
              const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
              const label = routeMap[segment] || segment;

              return (
                <React.Fragment key={href}>
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="font-bold underline decoration-primary/30 underline-offset-4">
                        {label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
