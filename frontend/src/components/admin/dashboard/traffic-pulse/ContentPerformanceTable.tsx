"use client";

import React from "react";
import { AnalyticsTopPost } from "@/shared/api/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Eye } from "lucide-react";
import { AdminTable } from "@/components/admin/common/admin-table";
import { ColumnDef } from "@tanstack/react-table";

interface ContentPerformanceTableProps {
  articles: AnalyticsTopPost[];
}

export const ContentPerformanceTable: React.FC<
  ContentPerformanceTableProps
> = ({ articles }) => {
  const columns: ColumnDef<AnalyticsTopPost>[] = [
    {
      accessorKey: "title",
      header: "文章标题",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.title}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "views",
      header: () => <div className="text-right">总浏览量</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1 font-medium text-indigo-600 dark:text-indigo-400">
          <Eye className="size-3 text-indigo-400" />
          {row.original.views.toLocaleString()}
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
