"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getPostBySlug } from "@/shared/api";
import { PostContent } from "@/components/post/post-content";
import { PostMeta } from "@/components/post/post-meta";
import { PostToc } from "@/components/post/post-toc";

interface TocItemRaw {
  id: string;
  title: string;
  level: number;
}

export default function PostPage() {
  const params = useParams();
  const slug = params.slug as string;

  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["post", slug],
    queryFn: () =>
      getPostBySlug({
        path: {
          post_type: "article",
          slug,
        },
      }),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="animate-pulse">
            <div className="mb-6 h-12 w-3/4 rounded bg-muted"></div>
            <div className="mb-8 h-6 w-1/2 rounded bg-muted"></div>
            <div className="space-y-4">
              <div className="h-4 w-full rounded bg-muted"></div>
              <div className="h-4 w-full rounded bg-muted"></div>
              <div className="h-4 w-3/4 rounded bg-muted"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post?.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-4 text-4xl font-bold">文章未找到</h1>
          <p className="text-muted-foreground">
            抱歉，您访问的文章不存在或已被删除。
          </p>
        </div>
      </div>
    );
  }

  const postData = post.data;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* 文章标题 */}
        <h1 className="mb-6 text-4xl font-bold">{postData.title}</h1>

        {/* 文章元信息 */}
        {postData.author && (
          <PostMeta
            author={{
              username: postData.author.username,
              full_name: postData.author.full_name || undefined,
              avatar: postData.author.avatar || undefined,
            }}
            publishedAt={postData.published_at || ""}
            readingTime={postData.reading_time}
            viewCount={postData.view_count}
            className="mb-8"
          />
        )}

        {/* 标签 */}
        {postData.tags && postData.tags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {postData.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_250px]">
          {/* 文章内容 */}
          <PostContent html={postData.content_html} />

          {/* 侧边栏：目录 */}
          {postData.toc && postData.toc.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-20">
                <PostToc
                  toc={(postData.toc as TocItemRaw[]).map((item) => ({
                    id: item.id,
                    title: item.title,
                    level: item.level,
                  }))}
                />
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
