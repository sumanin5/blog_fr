import { MDXProvider } from "@/components/mdx";
import ShowcaseContent from "@/content/mdx-showcase.mdx";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Github, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

// 元数据（从 MDX 文件中导出）
const metadata = {
  title: "MDX 功能展示",
  description: "展示 MDX 的各种功能和组件集成",
  author: "开发团队",
  date: "2024-12-08",
};

/**
 * 📄 MDX 功能展示页面
 *
 * 展示 MDX 的所有功能，包括：
 * - Markdown 语法
 * - React 组件集成
 * - 交互式内容
 * - 元数据使用
 */
export default function MDXShowcase() {
  const navigate = useNavigate();

  return (
    <div className="bg-background min-h-screen">
      {/* 页面头部 */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-14 z-40 border-b backdrop-blur">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            {/* 返回按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate("/mdx-editor")}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                在线编辑器
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open("https://github.com/mdx-js/mdx", "_blank")
                }
                className="gap-2"
              >
                <Github className="h-4 w-4" />
                GitHub
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("https://mdxjs.com/docs/", "_blank")}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                文档
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题卡片 */}
        <div className="bg-card mx-auto mb-8 max-w-6xl rounded-lg border p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
              <FileText className="text-primary h-6 w-6" />
            </div>
            <div className="flex-1">
              <h1 className="mb-2 text-3xl font-bold tracking-tight">
                {metadata.title}
              </h1>
              <p className="text-muted-foreground mb-4">
                {metadata.description}
              </p>
              <div className="text-muted-foreground flex gap-4 text-sm">
                <span>作者: {metadata.author}</span>
                <span>•</span>
                <span>日期: {metadata.date}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MDX 内容 */}
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <MDXProvider>
            <ShowcaseContent />
          </MDXProvider>
        </article>

        {/* 页脚提示 */}
        <div className="bg-muted/50 mx-auto mt-12 max-w-6xl rounded-lg border p-6 text-center">
          <p className="text-muted-foreground text-sm">
            💡 这个页面完全由 MDX 生成，结合了 Markdown 和 React
            组件的强大功能。
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            查看源文件：
            <code className="bg-background mx-2 rounded px-2 py-1 text-xs">
              src/content/mdx-showcase.mdx
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
