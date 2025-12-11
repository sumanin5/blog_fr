/**
 * 📋 通用 MDX 页面布局组件
 *
 * 这是一个可以包裹任何 MDX 内容的通用组件，提供统一的布局和功能：
 *
 * 核心功能:
 * 1. 🎨 统一的页面布局和样式
 * 2. 📋 自动集成目录组件（TableOfContents）
 * 3. 📍 导航栏和返回按钮
 * 4. 📄 元数据展示（标题、作者、日期等）
 * 5. 🏷️ 标签系统
 * 6. 🔄 分享功能
 * 7. 📱 响应式设计
 *
 * 使用方法:
 * ```tsx
 * <MDXPageLayout
 *   metadata={metadata}
 *   MDXContent={YourMDXContent}
 * />
 * ```
 */
import React from "react";
import { MDXProvider, TableOfContents } from "@/components/mdx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Calendar, Clock, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SiGithub } from "react-icons/si";

/**
 * 文章元数据类型定义
 */
interface ArticleMetadata {
  title: string;
  description: string;
  author?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  coverImage?: string;
  date: string;
  readTime?: string;
  tags?: string[];
}

/**
 * MDX 页面布局组件属性
 */
interface MDXPageLayoutProps {
  metadata: ArticleMetadata;
  MDXContent: React.ComponentType; // MDX 组件
  showTOC?: boolean; // 是否显示目录，默认 true
  showHeader?: boolean; // 是否显示头部，默认 true
  showFooter?: boolean; // 是否显示页脚，默认 true
  className?: string; // 自定义 CSS 类
  children?: React.ReactNode; // 额外内容
}

/**
 * 默认作者信息
 */
const defaultAuthor = {
  name: "开发团队",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Developer",
  role: "前端开发工程师",
};

/**
 * MDX 页面布局主组件
 */
export function MDXPageLayout({
  metadata,
  MDXContent,
  showTOC = true,
  showHeader = true,
  showFooter = true,
  className = "",
  children,
}: MDXPageLayoutProps) {
  const navigate = useNavigate();

  // 合并默认作者信息
  const author = metadata.author
    ? { ...defaultAuthor, ...metadata.author }
    : defaultAuthor;

  /**
   * 分享当前页面
   */
  const handleShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      // 这里可以替换为更好的提示组件，比如 toast
      alert("链接已复制到剪贴板！");
    } catch (error) {
      console.error("分享失败:", error);
    }
  };

  return (
    <div className={`bg-background min-h-screen ${className}`}>
      {/* 顶部导航栏 */}
      {/*{showHeader && (
        <div className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-14 z-40 border-b backdrop-blur">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="gap-2 pl-0 transition-all hover:pl-2"
              >
                <ArrowLeft className="h-4 w-4" />
                返回
              </Button>

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
                  onClick={() =>
                    window.open("https://mdxjs.com/docs/", "_blank")
                  }
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  文档
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}*/}

      {/* 主内容区域 */}
      <div className="container mx-auto px-4 py-8">
        {/* 文章头部信息 */}
        <article className="mx-auto max-w-4xl">
          {/* 标签 */}
          {metadata.tags && metadata.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
              {metadata.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="px-3 py-1">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

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
              {author.avatar && (
                <img
                  src={author.avatar}
                  alt={author.name}
                  className="border-border h-10 w-10 rounded-full border"
                />
              )}
              <div className="text-left">
                <p className="text-foreground font-medium">{author.name}</p>
                {author.role && <p className="text-xs">{author.role}</p>}
              </div>
            </div>

            {/* 分隔线 */}
            <div className="bg-border h-8 w-px" />

            {/* 日期和阅读时间 */}
            <div className="flex flex-col items-start gap-1">
              <span className="flex items-center">
                <Calendar className="mr-2 h-3 w-3" /> {metadata.date}
              </span>
              {metadata.readTime && (
                <span className="flex items-center">
                  <Clock className="mr-2 h-3 w-3" /> {metadata.readTime}
                </span>
              )}
            </div>
          </div>

          {/* 封面图 */}
          {/* {metadata.coverImage && (
            <div className="bg-muted border-border mb-10 aspect-video w-full overflow-hidden rounded-xl border">
              <img
                src={metadata.coverImage}
                alt={metadata.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}*/}
        </article>

        {/* MDX 内容 */}
        <article className="prose prose-neutral dark:prose-invert mx-auto max-w-none">
          <MDXProvider>
            {/* 目录组件 - 自动集成 */}
            {showTOC && <TableOfContents />}

            {/* 主要 MDX 内容 */}
            <MDXContent />

            {/* 额外的子内容 */}
            {children}
          </MDXProvider>
        </article>

        {/* 文章底部：分享区域 */}
        {showFooter && (
          <>
            <div className="border-border mx-auto mt-12 flex max-w-4xl items-center justify-between border-t pt-8">
              <div className="text-muted-foreground text-sm">
                觉得这篇文章有用？分享给你的朋友吧！
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleShare}>
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
                使用
                <code className="bg-background mx-2 rounded px-2 py-1 text-xs">
                  MDXPageLayout
                </code>
                组件快速构建 MDX 页面。
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MDXPageLayout;
