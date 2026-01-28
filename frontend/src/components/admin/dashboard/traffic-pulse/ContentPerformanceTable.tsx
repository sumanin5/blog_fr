"use client";

import React from "react";
import { ArticleStat } from "@/types/analytics";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Eye, Clock, Bot, Users } from "lucide-react";
import { AdminTable } from "@/components/admin/common/admin-table";
import { ColumnDef } from "@tanstack/react-table";

interface ContentPerformanceTableProps {
  articles: ArticleStat[];
}

export const ContentPerformanceTable: React.FC<
  ContentPerformanceTableProps
> = ({ articles }) => {
  const columns: ColumnDef<ArticleStat>[] = [
    {
      accessorKey: "title",
      header: "文章标题",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.title}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">
            {row.original.url}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "views",
      header: () => <div className="text-right">真实浏览量</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1 font-medium text-indigo-600 dark:text-indigo-400">
          {row.original.views.toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "uniqueVisitors",
      header: () => <div className="text-right">独立访客</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1 text-slate-600 dark:text-slate-400">
          <Users className="size-3 text-slate-400" />
          {row.original.uniqueVisitors.toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "avgTimeOnPage",
      header: () => <div className="text-right">平均停留</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1 text-slate-600 dark:text-slate-400">
          <Clock className="size-3 text-slate-400" />
          {Math.round(row.original.avgTimeOnPage)}s
        </div>
      ),
    },
    {
      accessorKey: "botHits",
      header: () => <div className="text-right">爬虫抓取</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1 text-rose-600 dark:text-rose-400">
          <Bot className="size-3 text-rose-400" />
          {row.original.botHits}
        </div>
      ),
    },
  ];

  return (
    <Card className="col-span-1 lg:col-span-2 overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Eye className="size-5 text-slate-400" />
          <div>
            <CardTitle>内容表现分析</CardTitle>
            <CardDescription>
              按浏览量排序的文章数据 (Top Content)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <AdminTable data={articles} columns={columns} />
      </CardContent>
    </Card>
  );
};
