import { Calendar, Clock, Eye, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PostMetaProps {
  author: {
    username: string;
    full_name?: string;
    avatar?: string;
  };
  publishedAt?: string;
  readingTime: number;
  viewCount: number;
  className?: string;
}

/**
 * 文章元信息组件
 *
 * 显示：作者、发布时间、阅读时间、浏览量
 */
export function PostMeta({
  author,
  publishedAt,
  readingTime,
  viewCount,
  className = "",
}: PostMetaProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "未发布";
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-4 text-sm text-muted-foreground ${className}`}
    >
      {/* 作者 */}
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={author.avatar} alt={author.username} />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <span>{author.full_name || author.username}</span>
      </div>

      {/* 发布时间 */}
      <div className="flex items-center gap-1.5">
        <Calendar className="h-4 w-4" />
        <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
      </div>

      {/* 阅读时间 */}
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4" />
        <span>{readingTime} 分钟阅读</span>
      </div>

      {/* 浏览量 */}
      <div className="flex items-center gap-1.5">
        <Eye className="h-4 w-4" />
        <span>{viewCount} 次浏览</span>
      </div>
    </div>
  );
}
