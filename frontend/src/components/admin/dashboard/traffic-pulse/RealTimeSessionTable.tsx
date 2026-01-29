"use client";

import React, { useState } from "react";
import { AnalyticsSessionItem } from "@/shared/api/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Laptop,
  Smartphone,
  Tablet,
  Bot,
  MapPin,
  Globe,
  Clock,
  X,
  ExternalLink,
  MousePointerClick,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useAnalyticsSessionDetail } from "@/hooks/admin/use-analytics-stats";

interface RealTimeSessionTableProps {
  sessions: AnalyticsSessionItem[];
}

export const RealTimeSessionTable: React.FC<RealTimeSessionTableProps> = ({
  sessions,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  const { data: sessionDetail, isLoading: loadingDetail } =
    useAnalyticsSessionDetail(selectedSessionId);

  const getDeviceIcon = (deviceInfo: string, isBot: boolean) => {
    if (isBot) return <Bot className="size-4" />;
    const lower = deviceInfo.toLowerCase();
    if (
      lower.includes("mobile") ||
      lower.includes("android") ||
      lower.includes("ios")
    )
      return <Smartphone className="size-4" />;
    if (lower.includes("tablet") || lower.includes("ipad"))
      return <Tablet className="size-4" />;
    return <Laptop className="size-4" />;
  };

  const columns: ColumnDef<AnalyticsSessionItem>[] = [
    {
      accessorKey: "ipAddress",
      header: "用户/IP",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              !row.original.isBot ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          <div>
            <div className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
              {row.original.ipAddress}
            </div>
            <div className="text-xs text-slate-400">
              {new Date(row.original.startTime).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "location",
      header: "地理位置",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <MapPin className="size-3 text-slate-400" />
          <span
            className="truncate max-w-[200px]"
            title={`${row.original.city}, ${row.original.country}`}
          >
            {row.original.city || "Unknown"}, {row.original.country || "-"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "device",
      header: "设备来源",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            {getDeviceIcon(row.original.deviceInfo, row.original.isBot)}
            <span
              className="text-xs truncate max-w-[300px]"
              title={row.original.deviceInfo}
            >
              {row.original.deviceInfo}
            </span>
          </div>
          {row.original.isBot && (
            <span className="text-[10px] text-rose-500">Bot Detected</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "pageCount",
      header: () => <div className="text-right">浏览页数</div>,
      cell: ({ row }) => (
        <div className="text-right text-slate-600 dark:text-slate-400 font-medium">
          {row.original.pageCount}
        </div>
      ),
    },
    {
      accessorKey: "duration",
      header: () => <div className="text-right">停留时长</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1 text-slate-600 dark:text-slate-400">
          <Clock className="size-3 text-slate-400" />
          {row.original.duration}s
        </div>
      ),
    },
  ];

  const renderHeader = (col: ColumnDef<AnalyticsSessionItem>) => {
    if (typeof col.header === "function") {
      // @ts-expect-error - 避开复杂的 HeaderContext 类型
      return col.header({});
    }
    return col.header as React.ReactNode;
  };

  const renderCell = (
    col: ColumnDef<AnalyticsSessionItem>,
    session: AnalyticsSessionItem,
  ) => {
    if (typeof col.cell === "function") {
      // @ts-expect-error - 避开复杂的 CellContext 类型
      return col.cell({
        row: { original: session },
      });
    }
    return null;
  };

  return (
    <div
      className={`grid gap-4 transition-all duration-300 ${
        selectedSessionId ? "grid-cols-2" : "grid-cols-1"
      }`}
    >
      {/* Session List */}
      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="size-5 text-slate-400" />
            <div>
              <CardTitle>实时访客记录</CardTitle>
              <CardDescription>
                点击行查看用户访问路径 · 最近 {sessions.length} 条会话
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          <div className="p-2">
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 hover:bg-muted/30 border-b">
                    {columns.map((col, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400"
                      >
                        {renderHeader(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr
                      key={session.sessionId}
                      onClick={() => setSelectedSessionId(session.sessionId)}
                      className={`border-b cursor-pointer transition-colors ${
                        selectedSessionId === session.sessionId
                          ? "bg-indigo-50 dark:bg-indigo-900/20"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      {columns.map((col, idx) => (
                        <td key={idx} className="px-4 py-3">
                          {renderCell(col, session)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Detail Panel */}
      {selectedSessionId && (
        <Card className="h-[600px] flex flex-col animate-in slide-in-from-right duration-300">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MousePointerClick className="size-5 text-indigo-500" />
                <div>
                  <CardTitle>用户行为轨迹</CardTitle>
                  <CardDescription>
                    Session ID: {selectedSessionId.slice(0, 8)}...
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSessionId(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4">
            {loadingDetail ? (
              <div className="flex items-center justify-center h-full text-slate-400 animate-pulse">
                加载中...
              </div>
            ) : sessionDetail ? (
              <div className="space-y-4">
                {/* User Info Summary */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-slate-400" />
                    <span className="font-medium">
                      {sessionDetail.city}, {sessionDetail.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {getDeviceIcon(
                      sessionDetail.deviceInfo,
                      sessionDetail.isBot,
                    )}
                    <span className="text-slate-600 dark:text-slate-400">
                      {sessionDetail.deviceInfo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="size-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">
                      总时长: {sessionDetail.duration}s · 访问{" "}
                      {sessionDetail.pageCount} 页
                    </span>
                  </div>
                </div>

                {/* Event Timeline */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300">
                    访问路径时间轴
                  </h4>
                  <div className="space-y-2">
                    {sessionDetail.events.map((event, idx) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {idx + 1}
                          </div>
                          {idx < sessionDetail.events.length - 1 && (
                            <div className="w-0.5 h-8 bg-slate-200 dark:bg-slate-700 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className="text-xs font-mono"
                            >
                              {event.eventType}
                            </Badge>
                            <span className="text-xs text-slate-400">
                              {new Date(event.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 group">
                            <ExternalLink className="size-3 text-slate-400 shrink-0" />
                            <a
                              href={event.pagePath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 truncate group-hover:underline"
                              title={event.pagePath}
                            >
                              {event.pagePath}
                            </a>
                          </div>
                          {event.duration !== null &&
                            event.duration !== undefined &&
                            event.duration > 0 && (
                              <div className="text-xs text-slate-500 mt-1">
                                停留: {event.duration}s
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                未找到会话详情
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
