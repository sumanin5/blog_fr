import { notFound } from "next/navigation";
import { PostDetailView } from "@/components/post/views/post-detail-view";
import { getAdminPostDetail } from "@/lib/post-api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// 3. 服务端页面组件
export default async function AdminPostDetailPage({ params }: PageProps) {
  const { id } = await params;
  const post = await getAdminPostDetail(id);

  if (!post) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/dashboard`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">文章预览</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/posts/${post.id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              编辑文章
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        {/*
         * 复用公共的 PostDetailView 组件进行渲染
         * 这样能保证管理员看到的排版和用户看到的一模一样
         */}
        <PostDetailView post={post} />
      </div>
    </div>
  );
}
