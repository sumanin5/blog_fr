"use client";

import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Eye, MessageSquare } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    { label: "我的文章", value: "12", icon: FileText, color: "text-blue-500" },
    { label: "全站阅读", value: "1.2k", icon: Eye, color: "text-green-500" },
    {
      label: "评论数",
      value: "48",
      icon: MessageSquare,
      color: "text-purple-500",
    },
    { label: "活跃用户", value: "5", icon: Users, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          你好, {user?.username}
        </h1>
        <p className="text-muted-foreground">欢迎回到博客管理系统。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                +2 since last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>最近更新</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">示例文章标题 #{i}</p>
                    <p className="text-xs text-muted-foreground">
                      最后更新于 2 小时前
                    </p>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    #a3f2k8
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>系统公告</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground italic">
              "这是一个现代化的博文管理系统，支持自动同步、版本控制和 MDX
              渲染。"
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
