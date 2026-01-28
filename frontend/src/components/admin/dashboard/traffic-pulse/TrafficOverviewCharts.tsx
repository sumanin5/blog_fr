"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { UserSession, DeviceType } from "@/types/analytics";

// 使用 CSS 变量 (oklch) 对应的 RGB/HSL 值，或者直接 Hardcode 一些好看的主题色
// 为了确保 Recharts 能用，还是用 Hex 或者 RGB 比较稳，这里先用一组固定的
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"];

interface TrafficOverviewChartsProps {
  sessions: UserSession[];
}

export const TrafficOverviewCharts: React.FC<TrafficOverviewChartsProps> = ({
  sessions,
}) => {
  // 1. Device Distribution
  const deviceData = [
    {
      name: "Desktop",
      value: sessions.filter((s) => s.device.type === DeviceType.DESKTOP)
        .length,
    },
    {
      name: "Mobile",
      value: sessions.filter((s) => s.device.type === DeviceType.MOBILE).length,
    },
    {
      name: "Tablet",
      value: sessions.filter((s) => s.device.type === DeviceType.TABLET).length,
    },
    {
      name: "Bot",
      value: sessions.filter((s) => s.device.type === DeviceType.BOT).length,
    },
  ];

  // 2. Traffic over time (mock: group by "hour" simplified)
  // Reversing to show latest first? No, usually time goes left to right.
  // The original was reverse(), let's check. Original code: slice(0, 50).map(...).reverse().
  // Assuming sessions are sorted (latest first), slicing top 50 means latest 50.
  // Reversing them makes them chronological (oldest -> newest).
  const trafficData = sessions
    .slice(0, 50)
    .map((s) => ({
      name: new Date(s.startTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      views: s.pageViews.length,
      duration: Math.round(
        s.pageViews.reduce((acc, p) => acc + p.durationSeconds, 0) / 60,
      ),
    }))
    .reverse();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <Card className="h-[400px] flex flex-col">
        <CardHeader>
          <CardTitle>设备分布</CardTitle>
          <CardDescription>用户使用的终端类型占比</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={deviceData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {deviceData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="h-[400px] flex flex-col">
        <CardHeader>
          <CardTitle>实时流量趋势</CardTitle>
          <CardDescription>
            最近访问的页面浏览量与停留时间 (Views & Duration)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 w-full min-h-0 pl-0 pr-4 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trafficData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="name"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#64748b" }}
              />
              <YAxis
                yAxisId="left"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#64748b" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#64748b" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="views"
                name="浏览量"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="duration"
                name="停留(分)"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
