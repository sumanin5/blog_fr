"use client";

import React from "react";
import Link from "next/link";
import {
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Calendar,
  GitCommit,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { PostShortResponse, PostStatus } from "@/shared/api/generated";

interface PostListTableProps {
  posts: PostShortResponse[];
  isLoading: boolean;
  onDelete?: (id: string) => void;
  showAuthor?: boolean;
}

export function PostListTable({
  posts,
  isLoading,
  onDelete,
  showAuthor = false,
}: PostListTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border bg-card p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground animate-pulse">
            正在加载文章列表...
          </p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-md border bg-card p-12 text-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <FileText className="h-12 w-12 opacity-20" />
          <p>暂无相关文章</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/posts/new">开始创作</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[400px]">标题</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>板块</TableHead>
            {showAuthor && <TableHead>作者</TableHead>}
            <TableHead>发布日期</TableHead>
            <TableHead>Git 摘要</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence mode="popLayout">
            {posts.map((post, index) => (
              <motion.tr
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="group hover:bg-muted/30 transition-colors"
              >
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                      {post.title}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      /{post.slug}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={post.status} />
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {post.post_type}
                  </Badge>
                </TableCell>
                {showAuthor && (
                  <TableCell>
                    <span className="text-sm font-medium">
                      {post.author?.username || "未知"}
                    </span>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Calendar className="size-3" />
                    {post.published_at
                      ? format(new Date(post.published_at), "yyyy-MM-dd", {
                          locale: zhCN,
                        })
                      : "未发布"}
                  </div>
                </TableCell>
                <TableCell>
                  {post.git_hash ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 font-mono">
                      <GitCommit className="size-3 text-primary/60" />
                      {post.git_hash.substring(0, 7)}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/40 italic">
                      无手动提交
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
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
                          href={`/posts/${post.slug}`}
                          target="_blank"
                          className="flex items-center"
                        >
                          <Eye className="mr-2 h-4 w-4" /> 查看原文
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/admin/posts/edit/${post.id}`}
                          className="flex items-center"
                        >
                          <Edit className="mr-2 h-4 w-4" /> 编辑修改
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete?.(post.id)}
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> 删除文章
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}

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
