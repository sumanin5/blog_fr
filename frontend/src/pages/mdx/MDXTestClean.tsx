import { MDXProvider } from "@/components/mdx";
import TestContent from "@/content/test-clean.mdx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Code, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MDXTestClean() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面头部 */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MDX 清理测试</h1>
            <p className="text-muted-foreground">测试修复后的 MDX 渲染功能</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <FileText className="h-3 w-3" />
            MDX
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Code className="h-3 w-3" />
            Mermaid
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Palette className="h-3 w-3" />
            Clean
          </Badge>
        </div>
      </div>

      {/* MDX 内容 */}
      <article className="prose prose-slate dark:prose-invert max-w-none">
        <MDXProvider>
          <TestContent />
        </MDXProvider>
      </article>

      {/* 页面底部信息 */}
      <div className="bg-muted/50 mt-12 rounded-lg border p-6">
        <h3 className="mb-2 text-lg font-semibold">测试信息</h3>
        <p className="text-muted-foreground text-sm">
          这个页面使用了清理后的 MDX 组件配置，应该解决了 HTML 嵌套问题。
          <br />
          查看源文件：
          <code className="bg-background mx-2 rounded px-2 py-1 text-xs">
            src/content/test-clean.mdx
          </code>
        </p>
      </div>
    </div>
  );
}
