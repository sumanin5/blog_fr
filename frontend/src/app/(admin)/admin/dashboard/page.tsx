"use client";

import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getMyPosts } from "@/shared/api/generated";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Eye, MessageSquare, Loader2 } from "lucide-react";
import { DashboardRecentPosts } from "@/components/admin/dashboard/recent-posts";

export default function DashboardPage() {
  const { user } = useAuth();

  // 获取用户的文章统计
  const { data: myPosts, isLoading } = useQuery({
    queryKey: ["dashboard", "my-posts-count"],
    queryFn: () =>
      getMyPosts({
        query: { limit: 1, offset: 0 }, // 只获取总数
        throwOnError: true,
      }),
    enabled: !!user,
  });

  const totalPosts = myPosts?.data?.total ?? 0;

  const statCards = [
    {
      label: "我的文章",
      value: totalPosts,
      icon: FileText,
      color: "text-blue-500",
      description: "已发布的文章数量",
    },
    {
      label: "全站阅读",
      value: "即将上线",
      icon: Eye,
      color: "text-green-500",
      description: "功能开发中",
    },
    {
      label: "评论数",
      value: "即将上线",
      icon: MessageSquare,
      color: "text-purple-500",
      description: "功能开发中",
    },
    {
      label: "活跃用户",
      value: user?.role === "superadmin" ? "管理员" : "普通用户",
      icon: Users,
      color: "text-orange-500",
      description: "当前角色",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          你好, {user?.username}
        </h1>
        <p className="text-muted-foreground">欢迎回到博客管理系统。</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading && stat.label === "我的文章" ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 最近更新和系统公告 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>最近更新</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardRecentPosts />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>系统公告</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>这是一个现代化的博文管理系统，支持：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>MDX 格式文章编辑</li>
                <li>实时预览功能</li>
                <li>Git 同步管理</li>
                <li>媒体文件管理</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
