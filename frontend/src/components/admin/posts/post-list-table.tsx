"use client";

import React from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostShortResponse } from "@/shared/api/generated";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ApiData } from "@/shared/api/transformers";
import { AdminTable } from "@/components/admin/common/admin-table";
import { getPostColumns } from "./post-columns";
import NextLink from "next/link";

interface PostListTableProps {
  posts: ApiData<PostShortResponse>[];
  isLoading: boolean;
  onDelete?: (post: ApiData<PostShortResponse>) => void;
  showAuthor?: boolean;
}

export function PostListTable({
  posts,
  isLoading,
  onDelete,
  showAuthor = false,
}: PostListTableProps) {
  const [deletingPost, setDeletingPost] =
    React.useState<ApiData<PostShortResponse> | null>(null);

  const columns = React.useMemo(
    () =>
      getPostColumns({
        onDelete: (post) => setDeletingPost(post),
        showAuthor,
      }),
    [showAuthor]
  );

  if (!isLoading && posts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="p-4 rounded-full bg-muted/50">
            <FileText className="h-12 w-12 opacity-20" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">暂无相关文章</p>
            <p className="text-sm">尚未发布任何内容，立即开始您的创作吧！</p>
          </div>
          <Button variant="outline" size="sm" asChild className="mt-2">
            <NextLink href="/admin/posts/new">开始创作</NextLink>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminTable
        data={posts}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="未找到符合条件的文章"
      />

      <AlertDialog
        open={!!deletingPost}
        onOpenChange={(open) => !open && setDeletingPost(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除这篇文章吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除文章
              <span className="font-bold text-foreground mx-1">
                {deletingPost?.title}
              </span>
              及其所有关联数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deletingPost && onDelete) {
                  onDelete(deletingPost);
                }
                setDeletingPost(null);
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
