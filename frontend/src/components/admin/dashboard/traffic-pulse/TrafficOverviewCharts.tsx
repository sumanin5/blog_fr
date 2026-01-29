"use client";

import React from "react";
import {
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
import { DeviceStats } from "@/shared/api/types";

// 使用 CSS 变量 (oklch) 对应的 RGB/HSL 值，或者直接 Hardcode 一些好看的主题色
// 为了确保 Recharts 能用，还是用 Hex 或者 RGB 比较稳，这里先用一组固定的
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"];

interface TrafficOverviewChartsProps {
  deviceStats: DeviceStats[];
  hourlyTraffic: Array<{
    time: string;
    visitors: number;
    pageViews: number;
  }>;
}

export const TrafficOverviewCharts: React.FC<TrafficOverviewChartsProps> = ({
  deviceStats,
  hourlyTraffic,
}) => {
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
                data={deviceStats}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {deviceStats.map((entry, index) => (
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
          <CardDescription>过去 24 小时的浏览量与访客数</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 w-full min-h-0 pl-0 pr-4 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourlyTraffic}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="time"
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
                dataKey="pageViews"
                name="浏览量"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="visitors"
                name="访客数"
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
