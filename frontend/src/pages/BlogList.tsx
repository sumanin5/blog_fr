import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * 📝 博客文章数据（示例）
 */
const BLOG_POSTS = [
  {
    id: 1,
    title: "React 19 新特性详解",
    excerpt:
      "深入了解 React 19 带来的革命性变化，包括 Server Components、Actions 等新功能。",
    date: "2024-01-15",
    readTime: "8 分钟",
    category: "React",
  },
  {
    id: 2,
    title: "TypeScript 5.0 实战指南",
    excerpt:
      "探索 TypeScript 5.0 的新特性，学习如何在实际项目中应用这些强大的类型系统功能。",
    date: "2024-01-10",
    readTime: "12 分钟",
    category: "TypeScript",
  },
  {
    id: 3,
    title: "Tailwind CSS 最佳实践",
    excerpt: "分享在大型项目中使用 Tailwind CSS 的经验和技巧，提升开发效率。",
    date: "2024-01-05",
    readTime: "6 分钟",
    category: "CSS",
  },
];

/**
 * 📚 博客列表页面
 */
export default function BlogList() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
          技术博客
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
          分享前端开发、架构设计、最佳实践等技术文章
        </p>
      </div>

      {/* 博客文章列表 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {BLOG_POSTS.map((post) => (
          <Card
            key={post.id}
            className="group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg"
            onClick={() => navigate(`/blog/${post.id}`)}
          >
            <CardContent className="p-6">
              {/* 分类标签 */}
              <div className="mb-3">
                <span className="bg-primary/10 text-primary inline-block rounded-full px-3 py-1 text-xs font-medium">
                  {post.category}
                </span>
              </div>

              {/* 标题 */}
              <h2 className="group-hover:text-primary mb-3 text-xl font-bold transition-colors">
                {post.title}
              </h2>

              {/* 摘要 */}
              <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">
                {post.excerpt}
              </p>

              {/* 元信息 */}
              <div className="text-muted-foreground mb-4 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{post.readTime}</span>
                </div>
              </div>

              {/* 阅读按钮 */}
              <Button
                variant="ghost"
                size="sm"
                className="group/btn w-full justify-between"
              >
                阅读全文
                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 空状态提示 */}
      {BLOG_POSTS.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">暂无文章</p>
        </div>
      )}
    </div>
  );
}
