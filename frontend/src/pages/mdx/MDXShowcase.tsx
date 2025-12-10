import { MDXProvider } from "@/components/mdx";
import ShowcaseContent from "@/content/mdx-showcase.mdx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Calendar, Clock, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SiGithub } from "react-icons/si";

// 元数据（从 MDX 文件中导出，未来可以从 frontmatter 读取）
const metadata = {
  title: "MDX 完整功能展示",
  description: "展示 MDX 的各种功能和组件集成",
  author: {
    name: "开发团队",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Developer", // 使用 DiceBear 生成头像
    role: "前端开发工程师",
  },
  coverImage:
    "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&h=630&fit=crop", // 代码主题封面
  date: "2024-12-08",
  readTime: "15 分钟",
  tags: ["MDX", "React", "TypeScript", "教程"],
};

/**
 * 📄 MDX 功能展示页面
 *
 * 展示 MDX 的所有功能，包括：
 * - Markdown 语法
 * - React 组件集成
 * - 交互式内容
 * - 元数据使用
 * - 作者信息展示
 * - 封面图展示
 * - AI 摘要功能（接口预留）
 */
export default function MDXShowcase() {
  const navigate = useNavigate();

  // TODO: 未来可以集成 AI 摘要功能
  // const [summary, setSummary] = useState<string | null>(null);
  // const [loadingSummary, setLoadingSummary] = useState(false);
  // const handleGenerateSummary = async () => {
  //   setLoadingSummary(true);
  //   try {
  //     const result = await fetch('/api/ai/summarize', {
  //       method: 'POST',
  //       body: JSON.stringify({ content: mdxContent })
  //     });
  //     setSummary(await result.text());
  //   } finally {
  //     setLoadingSummary(false);
  //   }
  // };

  return (
    <div>
      {/* 页面头部 */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-14 z-40 border-b backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* 返回按钮 - 添加悬停动画 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2 pl-0 transition-all hover:pl-2"
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
                <SiGithub className="h-4 w-4" />
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
        {/* 文章头部信息 */}
        <article className="mx-auto max-w-4xl">
          {/* 标签 */}
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            {metadata.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="px-3 py-1">
                {tag}
              </Badge>
            ))}
          </div>

          {/* 标题 */}
          <h1 className="text-primary mb-4 text-center text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">
            {metadata.title}
          </h1>

          {/* 描述 */}
          <p className="text-muted-foreground mx-auto mb-6 max-w-2xl text-center text-xl">
            {metadata.description}
          </p>

          {/* 作者和元信息 */}
          <div className="text-muted-foreground mb-10 flex flex-wrap items-center justify-center gap-6 text-sm">
            {/* 作者信息 */}
            <div className="flex items-center gap-2">
              <img
                src={metadata.author.avatar}
                alt={metadata.author.name}
                className="border-border h-10 w-10 rounded-full border"
              />
              <div className="text-left">
                <p className="text-foreground font-medium">
                  {metadata.author.name}
                </p>
                <p className="text-xs">{metadata.author.role}</p>
              </div>
            </div>

            {/* 分隔线 */}
            <div className="bg-border h-8 w-px" />

            {/* 日期和阅读时间 */}
            <div className="flex flex-col items-start gap-1">
              <span className="flex items-center">
                <Calendar className="mr-2 h-3 w-3" /> {metadata.date}
              </span>
              <span className="flex items-center">
                <Clock className="mr-2 h-3 w-3" /> {metadata.readTime}
              </span>
            </div>
          </div>

          {/* 封面图 */}
          {/* <div className="bg-muted border-border mb-10 aspect-video w-full overflow-hidden rounded-xl border">
            <img
              src={metadata.coverImage}
              alt={metadata.title}
              className="h-full w-full object-cover"
            />
          </div> */}

          {/* AI 摘要区域（预留接口） */}
          {/* TODO: 未来启用 AI 摘要功能时取消注释
          <div className="mb-10 rounded-xl border border-blue-100 bg-blue-50/50 p-6 dark:border-blue-900/50 dark:bg-blue-950/10">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Sparkles className="h-5 w-5" />
                <h3 className="text-lg font-semibold">AI 摘要</h3>
              </div>
              {!summary && (
                <Button
                  onClick={handleGenerateSummary}
                  disabled={loadingSummary}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  size="sm"
                >
                  {loadingSummary ? "生成中..." : "生成摘要"}
                </Button>
              )}
            </div>

            {loadingSummary && (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 w-3/4 rounded bg-blue-200/50"></div>
                <div className="h-4 w-full rounded bg-blue-200/50"></div>
                <div className="h-4 w-5/6 rounded bg-blue-200/50"></div>
              </div>
            )}

            {summary && (
              <div className="prose prose-blue max-w-none animate-in slide-in-from-top-2 text-sm leading-relaxed text-blue-900/80 duration-300 dark:text-blue-100/80 md:text-base">
                {summary}
              </div>
            )}
          </div>
          */}
        </article>

        {/* MDX 内容 */}
        <article className="prose prose-neutral dark:prose-invert mx-auto">
          <MDXProvider>
            <ShowcaseContent />
          </MDXProvider>
        </article>

        {/* 文章底部：分享区域 */}
        <div className="border-border mx-auto mt-12 flex max-w-4xl items-center justify-between border-t pt-8">
          <div className="text-muted-foreground text-sm">
            觉得这篇文章有用？分享给你的朋友吧！
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // TODO: 实现分享功能
                navigator.clipboard.writeText(window.location.href);
                alert("链接已复制到剪贴板！");
              }}
            >
              <Share2 className="mr-2 h-4 w-4" /> 分享
            </Button>
          </div>
        </div>

        {/* 页脚提示 */}
        <div className="bg-muted/50 mx-auto mt-12 max-w-4xl rounded-lg border p-6 text-center">
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
