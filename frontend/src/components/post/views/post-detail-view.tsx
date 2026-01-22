import { PostContent } from "@/components/post/content/post-content";
import { PostMeta } from "@/components/post/components/post-meta";
import { TableOfContents } from "@/components/mdx/utils/table-of-contents";
import { PostDetailResponse } from "@/shared/api/generated/types.gen";
import { ApiData } from "@/shared/api/transformers";

interface TocItem {
  id: string;
  title: string;
  level: number;
}

interface PostDetailViewProps {
  post: ApiData<PostDetailResponse>;
}

export async function PostDetailView({ post }: PostDetailViewProps) {
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
              full_name: post.author.fullName || undefined,
              avatar: post.author.avatar || undefined,
            }}
            publishedAt={post.publishedAt || ""}
            readingTime={post.readingTime || 0}
            viewCount={post.viewCount || 0}
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
          <PostContent
            mdx={post.contentMdx || undefined}
            ast={post.contentAst}
            toc={
              post.toc as Array<{ id: string; title: string; level: number }>
            }
            enableJsx={post.enableJsx}
            useServerRendering={post.useServerRendering}
          />
        </div>
      </div>
    </div>
  );
}
