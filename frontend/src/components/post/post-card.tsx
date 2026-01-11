import Link from "next/link";
import { PostShortResponse } from "@/shared/api/generated/types.gen";
import { Calendar, Clock } from "lucide-react";

interface PostCardProps {
  post: PostShortResponse;
}

export function PostCard({ post }: PostCardProps) {
  // 保持一致的日期格式化，防止水合错误
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  };

  const authorName = post.author?.full_name || post.author?.username || "Admin";

  // 获取封面图缩略图 URL（优先使用 medium，其次 small，最后原图）
  const coverUrl =
    post.cover_media?.thumbnails?.medium ||
    post.cover_media?.thumbnails?.small ||
    post.cover_media?.file_url;

  return (
    <Link href={`/posts/${post.slug}`} className="group block h-full">
      <article className="h-full cursor-pointer bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 flex flex-col">
        {/* 封面图区域 - 黄金比例的上半部分 */}
        <div className="relative h-64 overflow-hidden flex-shrink-0 bg-muted/20">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={post.title}
              loading="lazy"
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/30 opacity-60 group-hover:opacity-80 transition-opacity duration-500">
              <span className="text-muted-foreground/20 font-mono font-bold text-xl">
                BLOG_FR
              </span>
            </div>
          )}

          {/* 渐变叠加层 - 暗色模式更明显 */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent dark:from-background dark:via-background/40" />

          {/* 分类/标签 - 左下角 */}
          <div className="absolute bottom-3 left-3 z-10">
            {post.category?.name ? (
              <span className="inline-block px-2.5 py-1 bg-primary/90 dark:bg-primary/20 backdrop-blur-sm border border-primary dark:border-primary/30 text-primary-foreground dark:text-primary rounded text-xs font-mono uppercase tracking-wider shadow-sm">
                {post.category.name}
              </span>
            ) : (
              post.tags &&
              post.tags.length > 0 && (
                <span className="inline-block px-2.5 py-1 bg-primary/90 dark:bg-primary/20 backdrop-blur-sm border border-primary dark:border-primary/30 text-primary-foreground dark:text-primary rounded text-xs font-mono uppercase tracking-wider shadow-sm">
                  {post.tags[0].name}
                </span>
              )
            )}
          </div>
        </div>

        {/* 内容区域 - 黄金比例的下半部分 */}
        <div className="p-6 space-y-4 flex-1 flex flex-col">
          <div className="flex-1 space-y-3">
            <h3 className="text-xl line-clamp-2 text-foreground group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-primary/60 transition-all duration-300 font-bold leading-tight">
              {post.title}
            </h3>

            <p className="text-muted-foreground text-sm line-clamp-3 font-light leading-relaxed">
              {post.excerpt}
            </p>
          </div>

          {/* 底部元信息 */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 mt-auto border-t border-border font-mono">
            <span className="text-primary lowercase">
              @{authorName.replace(/\s+/g, "_")}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(post.created_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{post.reading_time} min</span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
