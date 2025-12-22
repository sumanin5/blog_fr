import { useParams, Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, Calendar, Share2 } from "lucide-react";
import { Button } from "@/shared/components/ui-extended";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";

/**
 * 📝 博客详情页面 (硬编码内容展示)
 */
export default function BlogDetail() {
  const { id } = useParams({ from: "/blog/$id" });

  // 模拟当前文章数据 (硬编码)
  const post = {
    title: "React 19 新特性详解",
    subtitle:
      "深入了解 React 19 带来的革命性变化，包括 Server Components、Actions 等新功能。",
    content: "示例内容...",
    date: "2024-01-15",
    readTime: "8 分钟",
    author: {
      name: "张伟",
      role: "前端架构师",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zhangwei",
    },
    coverImage:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80",
    tags: ["React", "前端", "JavaScript"],
  };

  return (
    <div className="flex flex-col pb-20">
      {/* 顶部返回导航 */}
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <Link to="/blog">
          <Button
            variant="ghost"
            size="sm"
            className="group text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            返回列表
          </Button>
        </Link>
      </div>

      <article className="container mx-auto max-w-4xl overflow-hidden px-4">
        {/* 文章头部信息 */}
        <header className="space-y-6 text-center md:text-left">
          <div className="flex flex-wrap justify-center gap-2 md:justify-start">
            {post.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-primary/10 text-primary border-none text-xs"
              >
                {tag}
              </Badge>
            ))}
          </div>

          <h1 className="text-3xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            {post.title}
          </h1>

          <p className="text-muted-foreground text-lg md:text-xl lg:leading-relaxed">
            {post.subtitle}
          </p>

          <div className="border-border/40 flex flex-col items-center justify-between gap-6 border-y py-8 md:flex-row">
            <div className="flex items-center gap-4 text-left">
              <Avatar className="border-primary/20 h-12 w-12 border-2">
                <AvatarImage src={post.author.avatar} alt={post.author.name} />
                <AvatarFallback>{post.author.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{post.author.name}</p>
                <p className="text-muted-foreground text-sm">
                  {post.author.role}
                </p>
              </div>
            </div>

            <div className="text-muted-foreground flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {post.date}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {post.readTime}
              </div>
            </div>
          </div>
        </header>

        {/* 封面图 */}
        <div className="border-border/40 my-12 overflow-hidden rounded-3xl border shadow-2xl">
          <img
            src={post.coverImage}
            alt={post.title}
            className="aspect-video w-full object-cover transition-transform duration-500 hover:scale-105"
          />
        </div>

        {/* 正文区域 */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="leading-relaxed">
            React 19 是 React 团队在 2024 年发布的一个里程碑版本。它不仅仅是 API
            的更新， 更是在底层架构上做出了巨大的突破。从 React Server
            Components 到新的 Actions 模式，
            开发者现在可以以更简洁的方式处理异步操作和表单提交。
          </p>
          <p className="leading-relaxed">
            结合 TanStack Router
            的全异步加载特性，现在的应用已经具备了“秒开”的体验。
            通过类型安全的路由参数传递（如当前页面的 ID:{" "}
            <code className="text-primary">{id}</code>），
            开发过程中的错误可以在编译阶段就被拦截。
          </p>

          <div className="bg-muted/50 border-border/40 my-8 rounded-2xl border p-8">
            <h3 className="mt-0 font-bold tracking-tight">小贴士</h3>
            <p className="mb-0">
              你可以尝试点击页面顶部的“博客”返回列表，体验由于我们配置了{" "}
              <code>defaultPreload: 'intent'</code> 带来的极致顺滑感。
            </p>
          </div>
        </div>

        {/* 底部操作 */}
        <footer className="border-border/40 mt-16 flex justify-center border-t pt-10">
          <Button
            variant="outline"
            className="hover:bg-primary hover:text-primary-foreground gap-2 rounded-full px-8 transition-all duration-300"
          >
            <Share2 className="h-4 w-4" />
            分享这篇文章
          </Button>
        </footer>
      </article>
    </div>
  );
}
