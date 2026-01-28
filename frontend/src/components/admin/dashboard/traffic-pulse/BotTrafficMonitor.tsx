"use client";

import React from "react";
import { UserSession, UserType } from "@/types/analytics";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, ShieldAlert, Globe, Server } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BotTrafficMonitorProps {
  sessions: UserSession[];
}

export const BotTrafficMonitor: React.FC<BotTrafficMonitorProps> = ({
  sessions,
}) => {
  const botSessions = sessions.filter((s) => s.userType === UserType.CRAWLER);

  // KPI
  const totalBotHits = botSessions.reduce(
    (acc, s) => acc + s.pageViews.length,
    0,
  );
  const distinctBotIPs = new Set(botSessions.map((s) => s.ipAddress)).size;
  const maliciousBots = botSessions.filter(
    (s) => s.pageViews.length > 8,
  ).length; // Mock criteria for "aggressive"

  // Bot Type Distribution
  const botTypes: Record<string, number> = {};
  botSessions.forEach((s) => {
    let type = "Other Bot";
    const ua = s.device.userAgent.toLowerCase();
    if (ua.includes("googlebot")) type = "Googlebot";
    else if (ua.includes("baiduspider")) type = "Baiduspider";
    else if (ua.includes("bingbot")) type = "Bingbot";
    else if (ua.includes("semrush")) type = "Semrush";
    else if (ua.includes("ahrefs")) type = "Ahrefs";

    botTypes[type] = (botTypes[type] || 0) + 1;
  });

  const botTypeData = Object.entries(botTypes)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Most Crawled Pages
  const pageHits: Record<string, number> = {};
  botSessions.forEach((s) => {
    s.pageViews.forEach((pv) => {
      pageHits[pv.url] = (pageHits[pv.url] || 0) + 1;
    });
  });
  const topCrawledPages = Object.entries(pageHits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([url, count]) => ({ url, count }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
        <ShieldAlert className="size-5 text-amber-600 dark:text-amber-500 mt-0.5" />
        <div>
          <h4 className="font-semibold text-amber-800 dark:text-amber-200">
            爬虫监控摘要
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            检测到 {botSessions.length} 个爬虫会话，共计 {totalBotHits}{" "}
            次页面请求。其中 {maliciousBots} 个 IP 表现出高频抓取行为。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                爬虫会话总数
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {botSessions.length}
              </h3>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg">
              <Bot className="size-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                独立 Bot IP
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {distinctBotIPs}
              </h3>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg">
              <Server className="size-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                消耗资源占比 (Est)
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                ~
                {(sessions.length > 0
                  ? (botSessions.length / sessions.length) * 100
                  : 0
                ).toFixed(1)}
                %
              </h3>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg">
              <Globe className="size-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bot Type Chart */}
        <Card className="h-[400px] flex flex-col">
          <CardHeader>
            <CardTitle>爬虫类型分布</CardTitle>
            <CardDescription>按 User-Agent 归类的机器人家族</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 w-full min-h-0 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={botTypeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }} // Light gray
                  contentStyle={{ borderRadius: 8 }}
                />
                <Bar
                  dataKey="value"
                  fill="#64748b"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Crawled Pages Table */}
        <Card>
          <CardHeader>
            <CardTitle>爬虫最爱访问的页面</CardTitle>
            <CardDescription>被抓取频率最高的内容</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                  <tr>
                    <th className="px-6 py-3">页面 URL</th>
                    <th className="px-6 py-3 text-right">抓取次数</th>
                    <th className="px-6 py-3 text-right">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {topCrawledPages.map((page, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {page.url}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-200">
                        {page.count}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Badge variant="outline">200 OK</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bot Activity Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-slate-400" />
            <div>
              <CardTitle>最近爬虫活动日志</CardTitle>
              <CardDescription>实时捕获的 Bot 访问记录</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium sticky top-0">
                <tr>
                  <th className="px-6 py-3">Bot IP</th>
                  <th className="px-6 py-3">User Agent (简称)</th>
                  <th className="px-6 py-3">访问时间</th>
                  <th className="px-6 py-3">页面数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {botSessions.slice(0, 15).map((session) => {
                  let uaShort = "Unknown";
                  const ua = session.device.userAgent.toLowerCase();
                  if (ua.includes("googlebot")) uaShort = "Googlebot";
                  else if (ua.includes("baiduspider")) uaShort = "Baiduspider";
                  else if (ua.includes("bingbot")) uaShort = "Bingbot";
                  else uaShort = "Other/Custom";

                  return (
                    <tr
                      key={session.sessionId}
                      className="hover:bg-rose-50/10 dark:hover:bg-rose-900/10"
                    >
                      <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">
                        {session.ipAddress}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            uaShort === "Googlebot"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {uaShort}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {new Date(session.startTime).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {session.pageViews.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
