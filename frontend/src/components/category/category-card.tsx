import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, FileText, Folder } from "lucide-react";
import type { CategoryResponse } from "@/shared/api/generated/types.gen";
import { cn } from "@/lib/utils";

// 临时扩展类型，等待 SDK 生成
interface CategoryWithCount extends CategoryResponse {
  post_count?: number;
}

interface CategoryCardProps {
  category: CategoryWithCount;
  postType: string;
}

export function CategoryCard({ category, postType }: CategoryCardProps) {
  const postCount = category.post_count ?? 0;

  // 有封面图模式
  if (category.cover_image) {
    return (
      <Link
        href={`/posts/${postType}/categories/${category.slug}`}
        className="group block h-full w-full outline-hidden"
      >
        {/*
           使用 'dark' 类强制此卡片内部使用暗色模式 Token (text-foreground -> white, bg-background -> dark)
           这确保了在图片背景上的文字可读性，同时使用了设计系统的变量
        */}
        <Card className="dark relative h-[360px] w-full overflow-hidden border-0 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          {/* 背景图片 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={category.cover_image}
            alt={category.name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />

          {/*
             遮罩层：从 transparent 到 background (dark模式下为黑/深色)
             完全依赖 Token，不写死 black
          */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />

          {/* 使用标准 Card 结构，通过 absolute 覆盖 */}
          <div className="absolute inset-0 flex flex-col justify-end">
            <CardHeader className="pb-2">
              <div className="mb-2 opacity-0 -translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                <Badge
                  variant="secondary"
                  className="backdrop-blur-md bg-secondary/50 hover:bg-secondary/70 border-0"
                >
                  {category.icon_preset || "Topic"}
                </Badge>
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight text-foreground drop-shadow-sm">
                {category.name}
              </CardTitle>
            </CardHeader>

            <CardContent className="pb-2">
              <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                {category.description || "暂无描述"}
              </p>
            </CardContent>

            <CardFooter className="pt-2 flex items-center justify-between text-muted-foreground border-t border-border/10 mx-6 px-0 pb-6">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                <span>{postCount} Articles</span>
              </div>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1 text-foreground" />
            </CardFooter>
          </div>
        </Card>
      </Link>
    );
  }

  // 无图模式
  return (
    <Link
      href={`/posts/${postType}/categories/${category.slug}`}
      className="group block h-full w-full outline-hidden"
    >
      <Card className="flex flex-col h-[360px] w-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/50">
        <CardHeader className="relative pb-2 px-8 pt-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary text-3xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 shadow-xs">
              {category.icon_preset || <Folder className="w-6 h-6" />}
            </div>

            <div className="opacity-50 group-hover:opacity-100 transition-opacity">
              <Badge
                variant="outline"
                className="font-mono text-[10px] uppercase tracking-wider border-dashed"
              >
                Topic
              </Badge>
            </div>
          </div>

          <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors line-clamp-1">
            {category.name}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 px-8">
          <p className="text-muted-foreground line-clamp-3 text-sm leading-7">
            {category.description || "暂无描述，点击探索更多精彩内容。"}
          </p>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t bg-muted/30 px-8 py-5 group-hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <FileText className="w-4 h-4 opacity-70" />
            <span>{postCount} Articles</span>
          </div>

          <div className="flex items-center justify-center w-8 h-8 rounded-full border bg-background group-hover:border-primary group-hover:text-primary transition-colors shadow-sm">
            <ArrowRight className="w-4 h-4" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
