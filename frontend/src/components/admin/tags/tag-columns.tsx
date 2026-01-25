"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { type TagResponse } from "@/shared/api/generated";
import { Button } from "@/components/ui/button";
import { Tags, Edit2, Trash2, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 定义本地业务类型，不再依赖转换工具类型
export interface AdminTag extends TagResponse {
  postCount?: number;
}

interface TagColumnsProps {
  onEdit: (tag: AdminTag) => void;
  onMergeRequest: () => void;
}

export const getTagColumns = ({
  onEdit,
  onMergeRequest,
}: TagColumnsProps): ColumnDef<AdminTag>[] => [
  {
    accessorKey: "name",
    header: "名称",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-200">
          <Tags className="size-3.5" />
        </div>
        <span className="font-semibold tracking-tight">
          {row.getValue("name")}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: ({ row }) => (
      <span className="font-mono text-[10px] text-muted-foreground/60 group-hover:text-muted-foreground transition-colors text-ellipsis overflow-hidden block">
        {row.getValue("slug")}
      </span>
    ),
  },
  {
    accessorKey: "color",
    header: "表现色",
    cell: ({ row }) => {
      const color = row.original.color || "#6b7280";
      return (
        <div className="flex items-center">
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-full border shadow-sm transition-all duration-300 hover:shadow-md"
            style={{
              backgroundColor: `${color}10`, // 10% opacity background
              borderColor: `${color}30`, // 20% opacity border
              color: color,
            }}
          >
            <div
              className="size-2 rounded-full shadow-inner animate-pulse-slow"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase">
              {color}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "postCount",
    header: "关联文章",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="font-mono text-[10px] tabular-nums border-muted-foreground/20 text-muted-foreground group-hover:bg-background transition-all"
      >
        {row.original.postCount ?? 0} Posts
      </Badge>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">管理</div>,
    cell: ({ row }) => {
      const tag = row.original;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 rounded-full hover:bg-muted"
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 p-1.5 shadow-xl border-border/50"
            >
              <DropdownMenuLabel className="px-2 pb-1.5 text-[10px] uppercase text-muted-foreground/70 font-bold tracking-widest">
                ENTRY ACTIONS
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => onEdit(tag)}
                className="rounded-md cursor-pointer"
              >
                <Edit2 className="mr-2 h-3.5 w-3.5" /> 快速编辑内容
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive rounded-md cursor-pointer"
                onClick={onMergeRequest}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" /> 永久移除并合并
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
