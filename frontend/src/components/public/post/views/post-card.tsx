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
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { routes } from "@/lib/routes";

interface PostCardProps {
  post: ApiData<PostShortResponse>;
  postType?: PostType | string;
}

export function PostCard({ post, postType }: PostCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "未知时间";
    const d = new Date(dateString);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const authorName = post.author?.fullName || post.author?.username || "管理员";
  const type = (postType || post.postType || "articles") as PostType;

  // 根据 cover_media_id 拼接缩略图 URL
  const coverUrl = post.coverMediaId
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/media/${post.coverMediaId}/thumbnail/medium`
    : null;

  const linkHref = routes.postDetailSlug(type, post.slug || "");
  const cardClassName = "group block h-full outline-hidden";

  // 模式 A: 有封面图 - 视觉冲击力 (适合 Articles)
  if (coverUrl) {
    return (
      <Link href={linkHref} className={cardClassName}>
        <Card className="flex flex-col h-full overflow-hidden border-border/40 bg-card/40 backdrop-blur-sm transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1.5 hover:border-primary/30 group-hover:ring-1 ring-primary/10">
          {/* 图片区域 */}
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            <img
              src={coverUrl}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-1000 will-change-transform group-hover:scale-110"
            />
            {/* 渐变遮罩 */}
            <div className="absolute inset-0 bg-linear-to-t from-background/95 via-background/20 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="absolute top-4 right-4">
              <Badge
                variant="secondary"
                className="backdrop-blur-xl bg-background/40 border-white/10 text-[10px] font-mono tracking-tight"
              >
                <Clock className="mr-1 h-3 w-3 opacity-60" />
                {post.readingTime || 5} MIN
              </Badge>
            </div>
          </div>

          {/* 内容区域 */}
          <CardHeader className="p-6 pb-2 -mt-10 z-10 relative">
            <div className="flex gap-2 mb-4 flex-wrap">
              {post.tags?.slice(0, 2).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-[10px] uppercase font-mono tracking-widest bg-primary/5 hover:bg-primary/15 text-primary/80 border border-primary/10 px-2 py-0.5"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
            <CardTitle className="text-xl font-bold leading-tight line-clamp-2 transition-colors duration-300 group-hover:text-primary">
              {post.title}
            </CardTitle>
          </CardHeader>

          <CardContent className="px-6 py-2 flex-1">
            <p className="text-muted-foreground/80 text-sm line-clamp-3 leading-relaxed font-light">
              {post.excerpt}
            </p>
          </CardContent>

          <CardFooter className="p-6 pt-4 mt-auto flex items-center justify-between text-[11px] text-muted-foreground/60 border-t border-border/40 bg-muted/5">
            <div className="flex items-center gap-2 group/author">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[8px] border border-primary/20 transition-colors group-hover/author:bg-primary group-hover/author:text-primary-foreground">
                {authorName[0].toUpperCase()}
              </div>
              <span className="font-medium transition-colors group-hover/author:text-primary">
                {authorName}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 opacity-40" />
                {formatDate(post.publishedAt || post.createdAt)}
              </span>
            </div>
          </CardFooter>
        </Card>
      </Link>
    );
  }

  // 模式 B: 无封面图 - 极致简约 & 极客特质 (适合 Ideas/Thoughts)
  return (
    <Link href={linkHref} className={cardClassName}>
      <Card className="relative flex flex-col h-full overflow-hidden bg-card/20 backdrop-blur-md border-border/40 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1.5 hover:border-primary/30 group">
        {/* Background Blueprint Pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
          <div className="absolute inset-0 bg-size-[20px_20px] bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)]" />
        </div>

        <CardHeader className="p-8 pb-4 z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="bg-primary/5 border-primary/20 text-primary font-mono text-[10px] px-2 py-0.5"
              >
                {type === "ideas" ? "THOUGHT" : "ARTICLE"}
              </Badge>
              <div className="flex items-center text-[10px] font-mono text-muted-foreground/60">
                <Clock className="mr-1.5 h-3 w-3" />
                <span>{post.readingTime || 5} MIN</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 opacity-40 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-primary" />
          </div>

          <CardTitle className="text-2xl font-bold tracking-tight leading-snug group-hover:text-primary transition-colors duration-300">
            {post.title}
          </CardTitle>

          <div className="flex flex-wrap gap-2 mt-6">
            {post.tags?.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-[10px] uppercase font-mono tracking-widest bg-background/20 hover:bg-primary/5 text-muted-foreground/70 hover:text-primary border-border/40 transition-colors px-2 py-0.5"
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent className="px-8 py-4 flex-1 z-10">
          <p className="text-muted-foreground/80 text-sm line-clamp-4 leading-relaxed font-light italic border-l-2 border-primary/20 pl-4 py-1">
            &ldquo;{post.excerpt || post.title}&rdquo;
          </p>
        </CardContent>

        <CardFooter className="p-8 pt-6 mt-auto z-10 border-t border-border/10 bg-muted/5">
          <div className="flex items-center justify-between w-full text-[10px] font-mono tracking-wider">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] border border-primary/20">
                {authorName[0].toUpperCase()}
              </div>
              <span className="text-muted-foreground/80 font-medium">
                {authorName}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground/40">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(post.publishedAt || post.createdAt)}</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
