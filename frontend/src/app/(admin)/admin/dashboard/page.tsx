"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Users,
  Eye,
  MousePointerClick,
  RefreshCw,
  ShieldAlert,
  Bot,
} from "lucide-react";

import {
  useAnalyticsDashboard,
  useAnalyticsSessions,
  useAnalyticsTopPosts,
} from "@/hooks/admin/use-analytics-stats";

// Traffic Pulse Components
import { TrafficOverviewCharts } from "@/components/admin/dashboard/traffic-pulse/TrafficOverviewCharts";
import { ContentPerformanceTable } from "@/components/admin/dashboard/traffic-pulse/ContentPerformanceTable";
import { UserBehaviorAnalytics } from "@/components/admin/dashboard/traffic-pulse/UserBehaviorAnalytics";
import { RealTimeSessionTable } from "@/components/admin/dashboard/traffic-pulse/RealTimeSessionTable";
import { BotTrafficMonitor } from "@/components/admin/dashboard/traffic-pulse/BotTrafficMonitor";

export default function DashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hook Data
  const {
    data: dashboard,
    isLoading: loadingDash,
    refetch: refetchDash,
  } = useAnalyticsDashboard();

  const {
    data: sessionsData,
    isLoading: loadingSessions,
    refetch: refetchSessions,
  } = useAnalyticsSessions();

  const {
    data: topPosts,
    isLoading: loadingPosts,
    refetch: refetchPosts,
  } = useAnalyticsTopPosts();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchDash(), refetchSessions(), refetchPosts()]);
    setIsRefreshing(false);
  };

  const isLoading = loadingDash || loadingSessions || loadingPosts;

  // Safe Accessors
  const stats = dashboard || {
    totalVisits: 0,
    realUserCount: 0,
    uniqueIPs: 0,
    crawlerCount: 0,
    botTrafficPercent: 0,
    avgSessionDuration: 0,
    deviceStats: [],
    hourlyTraffic: [],
  };

  const sessions = sessionsData?.items || [];
  const articles = topPosts || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">数据分析总览</h2>
          <p className="text-muted-foreground mt-1">
            实时追踪用户行为、内容表现与流量来源 (TrafficPulse v1.0)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                isRefreshing || isLoading ? "animate-spin" : ""
              }`}
            />
            刷新数据
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            总览仪表盘
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            用户分析
          </TabsTrigger>
          <TabsTrigger value="bots" className="gap-2">
            <Bot className="h-4 w-4" />
            爬虫监控
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  总访问量 (Total Visits)
                </CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalVisits}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-emerald-500 font-bold">Live</span> 过去
                  30 天
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  真实用户 (Real Users)
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.realUserCount}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.uniqueIPs} 独立 IP
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  爬虫请求 (Bot Hits)
                </CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.crawlerCount}</div>
                <p className="text-xs text-muted-foreground">
                  占比 {stats.botTrafficPercent.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  平均停留时长
                </CardTitle>
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(stats.avgSessionDuration)}s
                </div>
                <p className="text-xs text-muted-foreground">有效会话</p>
              </CardContent>
            </Card>
          </div>

          <TrafficOverviewCharts
            deviceStats={stats.deviceStats}
            hourlyTraffic={stats.hourlyTraffic}
          />
          <ContentPerformanceTable articles={articles} />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserBehaviorAnalytics sessions={sessions} />
          <div className="pt-6 border-t">
            <RealTimeSessionTable sessions={sessions} />
          </div>
        </TabsContent>

        <TabsContent value="bots" className="space-y-6">
          <BotTrafficMonitor sessions={sessions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
