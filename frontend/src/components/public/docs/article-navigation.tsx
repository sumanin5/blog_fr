import Link from "next/link";
import { BookOpen, ChevronLeft, FileText, List } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getPostHref } from "@/lib/article-series";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { PostShortResponse, PostType } from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";

interface ArticleNavigationProps {
  posts: ApiData<PostShortResponse>[];
  postType: PostType | string;
  currentSlug?: string | null;
  category?: {
    name: string;
    slug?: string | null;
  } | null;
  className?: string;
  mode?: "sidebar" | "sheet";
}

function ArticleNavigationContent({
  posts,
  postType,
  currentSlug,
  category,
  compact = false,
}: Omit<ArticleNavigationProps, "className" | "mode"> & { compact?: boolean }) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className={cn("space-y-3", compact ? "p-0" : "px-1")}>
        <Link
          href={routes.postCategories(postType)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          全部专栏
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Collection</span>
            </div>
            <h2 className="mt-1 truncate text-sm font-semibold text-foreground">
              {category?.name || "最新文章"}
            </h2>
          </div>
          <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
            {posts.length}
          </Badge>
        </div>
      </div>

      <Separator className="my-4" />

      <ScrollArea
        className={cn(
          "pr-2",
          compact ? "h-[calc(100vh-15rem)]" : "h-[calc(100vh-17rem)]",
        )}
      >
        <nav aria-label="文章目录">
          <ol className="space-y-0.5">
            {posts.map((post, index) => {
              const active = post.slug === currentSlug || post.id === currentSlug;

              return (
                <li key={post.id}>
                  <Link
                    href={getPostHref(postType, post)}
                    className={cn(
                      "group flex gap-2.5 rounded-md px-2 py-2 text-[13px] leading-5 transition-colors",
                      active
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 font-mono text-[10px] tabular-nums",
                        active ? "text-emerald-600 dark:text-emerald-400" : "opacity-50",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="line-clamp-2">{post.title}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
      </ScrollArea>
    </div>
  );
}

export function ArticleNavigation({
  posts,
  postType,
  currentSlug,
  category,
  className,
  mode = "sidebar",
}: ArticleNavigationProps) {
  if (posts.length === 0) return null;

  if (mode === "sheet") {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2 lg:hidden", className)}
          >
            <List className="h-4 w-4" />
            <span>文章列表</span>
          </Button>
        </SheetTrigger>

        <SheetContent side="left" className="w-[320px] pt-12">
          <SheetHeader className="mb-5 text-left">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              文章目录
            </SheetTitle>
            <SheetDescription className="sr-only">
              当前专栏下的文章列表
            </SheetDescription>
          </SheetHeader>
          <ArticleNavigationContent
            posts={posts}
            postType={postType}
            currentSlug={currentSlug}
            category={category}
            compact
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className={cn("hidden lg:block", className)}>
      <div className="sticky top-20">
        <ArticleNavigationContent
          posts={posts}
          postType={postType}
          currentSlug={currentSlug}
          category={category}
        />
      </div>
    </aside>
  );
}
