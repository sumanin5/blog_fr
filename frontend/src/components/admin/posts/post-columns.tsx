"use client";

import React from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import {
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Calendar,
  GitCommit,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PostShortResponse,
  PostStatus,
  PostType,
} from "@/shared/api/generated";
import { ApiData } from "@/shared/api/transformers";
import { routes } from "@/lib/routes";

interface PostColumnsProps {
  onDelete: (post: ApiData<PostShortResponse>) => void;
  showAuthor?: boolean;
}

export const getPostColumns = ({
  onDelete,
  showAuthor = false,
}: PostColumnsProps): ColumnDef<ApiData<PostShortResponse>>[] => {
  const columns: ColumnDef<ApiData<PostShortResponse>>[] = [
    {
      accessorKey: "title",
      header: "标题",
      cell: ({ row }) => {
        const post = row.original;
        return (
          <div className="flex flex-col gap-1 max-w-[300px]">
            <span className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
              {post.title}
            </span>
            <span className="text-xs text-muted-foreground font-mono truncate">
              /{post.slug}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const status = row.getValue("status") as PostStatus;
        return <StatusBadge status={status} />;
      },
    },
    {
      accessorKey: "postType",
      header: "板块",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.getValue("postType")}
        </Badge>
      ),
    },
  ];

  if (showAuthor) {
    columns.push({
      id: "author",
      header: "作者",
      cell: ({ row }) => {
        const post = row.original;
        return (
          <span className="text-sm font-medium">
            {post.author?.username || "未知"}
          </span>
        );
      },
    });
  }

  columns.push(
    {
      accessorKey: "publishedAt",
      header: "发布日期",
      cell: ({ row }) => {
        const date = row.getValue("publishedAt") as string;
        return (
          <div className="flex items-center gap-2 text-muted-foreground text-xs whitespace-nowrap">
            <Calendar className="size-3" />
            {date
              ? format(new Date(date), "yyyy-MM-dd", {
                  locale: zhCN,
                })
              : "未发布"}
          </div>
        );
      },
    },
    {
      accessorKey: "gitHash",
      header: "Git 摘要",
      cell: ({ row }) => {
        const hash = row.getValue("gitHash") as string;
        return hash ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 font-mono">
            <GitCommit className="size-3 text-primary/60" />
            {hash.substring(0, 7)}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/40 italic">
            无手动提交
          </span>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">操作</div>,
      cell: ({ row }) => {
        const post = row.original;

        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel>文章操作</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href={routes.postDetailSlug(
                      post.postType as PostType,
                      post.slug || ""
                    )}
                    target="_blank"
                    className="flex items-center"
                  >
                    <Eye className="mr-2 h-4 w-4" /> 查看原文
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href={`/admin/posts/${post.id}/edit`}
                    className="flex items-center"
                  >
                    <Edit className="mr-2 h-4 w-4" /> 编辑修改
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(post)}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> 删除文章
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    }
  );

  return columns;
};

function StatusBadge({ status }: { status?: PostStatus }) {
  switch (status) {
    case "published":
      return (
        <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
          已发布
        </Badge>
      );
    case "draft":
      return (
        <Badge
          variant="secondary"
          className="bg-slate-500/10 text-slate-600 border-slate-500/20"
        >
          草稿
        </Badge>
      );
    case "archived":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          已归档
        </Badge>
      );
    default:
      return <Badge variant="outline">未知</Badge>;
  }
}
