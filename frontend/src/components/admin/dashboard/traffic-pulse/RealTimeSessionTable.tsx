"use client";

import React, { useState } from "react";
import { UserSession, UserType, DeviceType } from "@/types/analytics";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Laptop,
  Smartphone,
  Tablet,
  Bot,
  MapPin,
  Globe,
  ChevronRight,
  X,
  Clock,
} from "lucide-react";
import { AdminTable } from "@/components/admin/common/admin-table";
import { ColumnDef } from "@tanstack/react-table";

interface RealTimeSessionTableProps {
  sessions: UserSession[];
}

export const RealTimeSessionTable: React.FC<RealTimeSessionTableProps> = ({
  sessions,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  const selectedSession = sessions.find(
    (s) => s.sessionId === selectedSessionId,
  );

  const getDeviceIcon = (type: DeviceType) => {
    switch (type) {
      case DeviceType.MOBILE:
        return <Smartphone className="size-4" />;
      case DeviceType.TABLET:
        return <Tablet className="size-4" />;
      case DeviceType.BOT:
        return <Bot className="size-4" />;
      default:
        return <Laptop className="size-4" />;
    }
  };

  const columns: ColumnDef<UserSession>[] = [
    {
      accessorKey: "ipAddress",
      header: "用户/IP",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              row.original.userType === UserType.REAL_USER
                ? "bg-emerald-500"
                : "bg-rose-500"
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
          <span>
            {row.original.location.city}, {row.original.location.country}
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
            {getDeviceIcon(row.original.device.type)}
            <span className="text-xs">{row.original.device.os}</span>
          </div>
          {row.original.userType === UserType.CRAWLER && (
            <span className="text-[10px] text-rose-500">Bot Detected</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "referrer",
      header: "来源",
      cell: ({ row }) => (
        <div className="text-slate-500 truncate max-w-[100px]">
          {row.original.referrer}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">操作</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedSessionId(row.original.sessionId)}
            className="h-8 w-8"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Session List */}
      <Card className="lg:col-span-2 h-[600px] flex flex-col">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="size-5 text-slate-400" />
            <div>
              <CardTitle>实时访客记录</CardTitle>
              <CardDescription>最近的访问会话详情</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          <div className="p-2">
            <AdminTable
              data={sessions.slice(0, 50)}
              columns={columns}
              getRowId={(row) => row.sessionId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Detail View Panel */}
      <div className="lg:col-span-1">
        {selectedSession ? (
          <Card className="h-full sticky top-6 animate-in slide-in-from-right-4 duration-300 flex flex-col">
            <div className="p-4 border-b flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50 rounded-t-xl">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  会话详情
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  {selectedSession.sessionId}
                </p>
              </div>
              <button
                onClick={() => setSelectedSessionId(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-4 space-y-6 overflow-y-auto flex-1">
              {/* User Profile */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  用户画像 (User Profile)
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">类型</span>
                    <Badge
                      variant={
                        selectedSession.userType === UserType.REAL_USER
                          ? "default" // shadcn defaults are usually primary/secondary/destructive
                          : "destructive"
                      }
                      className={
                        selectedSession.userType === UserType.REAL_USER
                          ? "bg-emerald-500 hover:bg-emerald-600"
                          : ""
                      }
                    >
                      {selectedSession.userType}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">IP 地址</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {selectedSession.ipAddress}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">地理位置</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {selectedSession.location.city} -{" "}
                      {selectedSession.location.region}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">浏览器/UA</span>
                    <span
                      className="text-slate-700 dark:text-slate-300 text-xs truncate max-w-[150px]"
                      title={selectedSession.device.userAgent}
                    >
                      {selectedSession.device.browser}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Journey Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                  访问路径 (Journey)
                </h4>
                <div className="relative pl-4 border-l-2 border-indigo-100 dark:border-indigo-900 space-y-6">
                  {selectedSession.pageViews.map((view, idx) => (
                    <div key={view.id} className="relative">
                      <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900 shadow-sm" />
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight mb-1">
                          {view.title}
                        </p>
                        <p className="text-xs text-slate-400 truncate mb-2">
                          {view.url}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {new Date(view.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                            停留 {view.durationSeconds}s
                          </span>
                        </div>
                      </div>
                      {idx < selectedSession.pageViews.length - 1 && (
                        <div className="absolute left-[calc(50%-1rem)] -bottom-4 text-indigo-300 dark:text-indigo-700">
                          ↓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/20 text-slate-400">
            <Globe className="size-12 mb-3 opacity-20" />
            <p className="font-medium">选择左侧会话查看详情</p>
            <p className="text-sm mt-1">
              Select a session to view the user journey map.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
