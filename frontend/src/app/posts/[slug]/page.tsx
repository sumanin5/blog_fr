"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getPostBySlug } from "@/shared/api";
import { PostContent } from "@/components/post/post-content";
import { PostMeta } from "@/components/post/post-meta";
import { TableOfContents } from "@/components/mdx/table-of-contents";

// This interface from the API might differ slightly from the component's expected type
// but we map it below anyway.
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
      {/*
        浮动目录按钮
        它有 fixed 定位，放在哪里都不会影响布局文档流，
        但放在这里逻辑上比较清晰
      */}
      {postData.toc && postData.toc.length > 0 && (
        <TableOfContents
          toc={(postData.toc as TocItemRaw[]).map((item) => ({
            id: item.id,
            title: item.title,
            level: item.level,
          }))}
        />
      )}

      <div className="mx-auto max-w-6xl">
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

        {/*
           文章内容
           移除了右侧侧边栏，现在的布局是单栏居中，更适合长文阅读
        */}
        <div className="w-full min-w-0">
          <PostContent html={postData.content_html} />
        </div>
      </div>
    </div>
  );
}
