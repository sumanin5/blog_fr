"use client";

import { useQuery } from "@tanstack/react-query";
import { getMyPosts } from "@/shared/api/generated";
import { Loader2, FileText } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export function DashboardRecentPosts() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "recent-posts"],
    queryFn: () =>
      getMyPosts({
        query: { limit: 5, offset: 0 },
        throwOnError: true,
      }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const posts = data?.data?.items || [];

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">还没有文章</p>
        <Link
          href="/admin/posts/new"
          className="text-sm text-primary hover:underline mt-2"
        >
          创建第一篇文章
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/admin/posts/edit/${post.id}`}
          className="flex items-center gap-4 hover:bg-muted/50 p-2 rounded-lg transition-colors"
        >
          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1 min-w-0">
            <p className="text-sm font-medium truncate">{post.title}</p>
            <p className="text-xs text-muted-foreground">
              {post.updated_at
                ? formatDistanceToNow(new Date(post.updated_at), {
                    addSuffix: true,
                    locale: zhCN,
                  })
                : "刚刚"}
            </p>
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            {post.id.slice(0, 8)}
          </div>
        </Link>
      ))}
    </div>
  );
}
