import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PostShortResponse, PostType } from "@/shared/api/generated/types.gen";
import { ApiData } from "@/shared/api/transformers";
import { Calendar, Clock, User, ArrowRight } from "lucide-react";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface PostCardProps {
  post: ApiData<PostShortResponse>;
}

export function PostCard({ post }: PostCardProps) {
  // 保持一致的日期格式化
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  };

  const authorName = post.author?.fullName || post.author?.username || "Admin";

  const coverUrl =
    post.coverMedia?.thumbnails?.medium ||
    post.coverMedia?.thumbnails?.small ||
    post.coverMedia?.fileUrl;

  const DetailLink = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <Link
      href={routes.postDetailSlug(post.postType as PostType, post.slug)}
      className={cn("group block h-full outline-hidden", className)}
    >
      {children}
    </Link>
  );

  // 模式 A: 有封面图 - 视觉冲击力
  if (coverUrl) {
    return (
      <DetailLink>
        <Card className="flex flex-col h-full overflow-hidden border-0 bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group-hover:ring-1 ring-primary/20">
          {/* 图片区域 */}
          <div className="relative h-56 w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt={post.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* 渐变遮罩 */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-80" />

            <div className="absolute top-3 right-3">
              <Badge
                variant="secondary"
                className="backdrop-blur-md bg-background/50 hover:bg-background/80"
              >
                {post.readingTime} min read
              </Badge>
            </div>
          </div>

          {/* 内容区域 */}
          <CardHeader className="p-5 pb-2 -mt-12 z-10 relative">
            <div className="flex gap-2 mb-3 flex-wrap">
              {post.tags?.slice(0, 2).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="default"
                  className="text-xs bg-primary/90 hover:bg-primary border-0"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
            <CardTitle className="text-xl font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {post.title}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 pt-2 flex-1">
            <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
              {post.excerpt}
            </p>
          </CardContent>

          <CardFooter className="p-5 pt-0 mt-auto flex items-center justify-between text-xs text-muted-foreground border-t bg-muted/20 py-3">
            <div className="flex items-center gap-2">
              <User className="w-3 h-3" />
              <span className="font-medium truncate max-w-[100px]">
                {authorName}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono opacity-80">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(post.createdAt)}</span>
            </div>
          </CardFooter>
        </Card>
      </DetailLink>
    );
  }

  // 模式 B: 无封面图 - 纯文字/文档风格
  return (
    <DetailLink>
      <Card className="flex flex-col h-full overflow-hidden bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-l-4 border-l-primary/40 hover:border-l-primary group-hover:border-t group-hover:border-r group-hover:border-b">
        <CardHeader className="p-6 pb-2">
          {/* 顶部元信息 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{post.readingTime} min read</span>
            </div>
            {/* 装饰性图标 */}
            <div className="p-2 rounded-full bg-secondary/50 text-secondary-foreground">
              <ArrowRight className="w-4 h-4 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
            </div>
          </div>

          <CardTitle className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors mb-2">
            {post.title}
          </CardTitle>

          <div className="flex flex-wrap gap-2 mt-2">
            {post.tags?.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-[10px] font-normal text-muted-foreground border-dashed"
              >
                #{tag.name}
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-2 flex-1">
          <p className="text-muted-foreground text-base line-clamp-5 leading-7">
            {post.excerpt || "暂无摘要..."}
          </p>
        </CardContent>

        <CardFooter className="p-6 pt-4 mt-auto border-t border-dashed">
          <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                {authorName[0].toUpperCase()}
              </div>
              <span className="font-medium">@{authorName}</span>
            </div>
            <span className="font-mono opacity-60">
              {formatDate(post.createdAt)}
            </span>
          </div>
        </CardFooter>
      </Card>
    </DetailLink>
  );
}
