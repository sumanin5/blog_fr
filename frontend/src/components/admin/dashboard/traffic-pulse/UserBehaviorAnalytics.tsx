"use client";

import React from "react";
import { AnalyticsSessionItem } from "@/shared/api/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, MapPin, Activity, Zap, Percent } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface UserBehaviorAnalyticsProps {
  sessions: AnalyticsSessionItem[];
}

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export const UserBehaviorAnalytics: React.FC<UserBehaviorAnalyticsProps> = ({
  sessions,
}) => {
  const realUsers = sessions.filter((s) => !s.isBot);

  // KPI Calculations
  const totalUsers = realUsers.length;
  const avgPages = totalUsers
    ? (realUsers.reduce((acc, s) => acc + s.pageCount, 0) / totalUsers).toFixed(
        1,
      )
    : "0";
  const bounceRate = totalUsers
    ? (
        (realUsers.filter((s) => s.pageCount === 1).length / totalUsers) *
        100
      ).toFixed(1)
    : "0";

  // Engagement Segments (based on duration)
  const engagementData = [
    {
      name: "高活跃 (> 3m)",
      value: realUsers.filter((s) => s.duration > 180).length,
    },
    {
      name: "一般活跃 (30s-3m)",
      value: realUsers.filter((s) => s.duration >= 30 && s.duration <= 180)
        .length,
    },
    {
      name: "跳出/低活跃 (< 30s)",
      value: realUsers.filter((s) => s.duration < 30).length,
    },
  ];

  // Top Locations
  const locationCounts: Record<string, number> = {};
  realUsers.forEach((s) => {
    // Check if city/country are available
    const city = s.city || "Unknown";
    const country = s.country || "Unknown";
    const loc = `${city}, ${country}`;
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  });
  const topLocations = Object.entries(locationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  // High Value Users (Top 10 by duration)
  const topUsers = [...realUsers]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                平均访问深度
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {avgPages} 页/人
              </h3>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Activity className="size-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                跳出率 (Bounce Rate) (Recent)
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {bounceRate}%
              </h3>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg">
              <Percent className="size-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                高价值用户 (Recent)
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {engagementData[0].value} 人
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Zap className="size-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Chart */}
        <Card className="h-[400px] flex flex-col">
          <CardHeader>
            <CardTitle>用户活跃度分布</CardTitle>
            <CardDescription>根据停留时长划分的用户粘性</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={engagementData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {engagementData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Location Chart */}
        <Card className="h-[400px] flex flex-col">
          <CardHeader>
            <CardTitle>Top 访问地区</CardTitle>
            <CardDescription>最近访问的用户来源</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 w-full min-h-0 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={topLocations}
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip cursor={{ fill: "#f1f5f9" }} />
                <Bar
                  dataKey="value"
                  fill="#6366f1"
                  radius={[0, 4, 4, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* High Value Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="size-5 text-slate-400" />
            <div>
              <CardTitle>高价值用户列表 (Top Active Users)</CardTitle>
              <CardDescription>停留时间最长的真实访客 (最近)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                <tr>
                  <th className="px-6 py-3">用户 IP / ID</th>
                  <th className="px-6 py-3">地理位置</th>
                  <th className="px-6 py-3">浏览页面数</th>
                  <th className="px-6 py-3">总停留时长</th>
                  <th className="px-6 py-3">设备</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {topUsers.map((user) => {
                  const duration = user.duration;
                  return (
                    <tr
                      key={user.sessionId}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-6 py-4">
                        <div className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {user.ipAddress}
                        </div>
                        <div className="text-xs text-slate-400">
                          {user.sessionId}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-3 text-slate-400" />
                          {user.city || "-"}, {user.country || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={user.pageCount > 3 ? "secondary" : "outline"}
                          className={
                            user.pageCount > 3
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                              : ""
                          }
                        >
                          {user.pageCount} 页
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {Math.floor(duration / 60)}m {duration % 60}s
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                        {user.deviceInfo}
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
