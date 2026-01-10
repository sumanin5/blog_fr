"use client";

import { PostContent } from "@/components/post/post-content";
import { PostMeta } from "@/components/post/post-meta";
import { TableOfContents } from "@/components/mdx/table-of-contents";
import { PostDetailResponse } from "@/shared/api/generated/types.gen";

interface TocItem {
  id: string;
  title: string;
  level: number;
}

interface PostDetailViewProps {
  post: PostDetailResponse;
}

export function PostDetailView({ post }: PostDetailViewProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 浮动目录按钮 */}
      {post.toc && post.toc.length > 0 && (
        <TableOfContents
          toc={(post.toc as TocItem[]).map((item) => ({
            id: item.id,
            title: item.title,
            level: item.level,
          }))}
        />
      )}

      <div className="mx-auto max-w-6xl">
        {/* 文章标题 */}
        <h1 className="mb-6 text-4xl font-bold">{post.title}</h1>

        {/* 文章元信息 */}
        {post.author && (
          <PostMeta
            author={{
              username: post.author.username,
              full_name: post.author.full_name || undefined,
              avatar: post.author.avatar || undefined,
            }}
            publishedAt={post.published_at || ""}
            readingTime={post.reading_time || 0}
            viewCount={post.view_count || 0}
            className="mb-8"
          />
        )}

        {/* 标签 */}
        {post.tags && post.tags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* 文章内容 */}
        <div className="w-full min-w-0">
          <PostContent html={post.content_html} />
        </div>
      </div>
    </div>
  );
}
