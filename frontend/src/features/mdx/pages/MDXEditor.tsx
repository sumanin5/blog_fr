import { useState, useEffect, useCallback, useRef } from "react";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css"; // 代码高亮样式
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Alert } from "@/shared/components/ui/alert";
import { components } from "@/shared/components/mdx/mdx-components"; // 直接从 mdx-components 导入
import {
  ArrowLeft,
  Copy,
  Download,
  Eye,
  Code,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// 组件映射已从 @/shared/components/mdx/MDXProvider 导入

// 默认模板 - 使用 String.raw 避免反斜杠转义问题
const DEFAULT_MDX = String.raw`# 欢迎使用 MDX 编辑器

这是一个**实时**的 MDX 编辑器，左边编写，右边实时预览！

## 功能特点

- ✅ 实时预览
- ✅ 支持 Markdown 语法
- ✅ 可以使用 React 组件
- ✅ 支持 GFM 表格
- ✅ 支持数学公式（KaTeX）

## React 组件示例

<Button>点击我</Button>

<Card className="my-4">
  <CardContent className="p-4">
    <p className="text-sm text-muted-foreground">你可以在 MDX 中使用 React 组件！</p>
  </CardContent>
</Card>

## 表格示例

| 功能 | 支持 | 说明 |
|------|:----:|------|
| Markdown | ✅ | 完整支持 |
| React | ✅ | 预置组件 |
| 表格 | ✅ | GFM 语法 |
| 数学公式 | ✅ | KaTeX |

## 数学公式示例

### 行内公式

- 质能方程：$E = mc^2$
- 勾股定理：$a^2 + b^2 = c^2$
- 欧拉公式：$e^{i\pi} + 1 = 0$

### 块级公式

二次方程求根公式：

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

高斯积分：

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

## 引用

> MDX 让你在 Markdown 中使用 React 组件

---

💡 Button、Card、CardContent、Alert 组件已预先提供。
`;

export default function MDXEditor() {
  const navigate = useNavigate();
  const [mdxCode, setMdxCode] = useState(DEFAULT_MDX);
  const [compiledMDX, setCompiledMDX] = useState<{
    default: React.ComponentType;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // 同步滚动的 refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  const compileMDX = useCallback(async (code: string) => {
    setIsCompiling(true);
    setError(null);
    try {
      const result = await evaluate(code, {
        ...runtime,
        development: false,
        baseUrl: import.meta.url,
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [rehypeKatex, rehypeHighlight], // 添加代码高亮
        useMDXComponents: () => ({
          ...components, // 使用统一的组件映射
          Button,
          Card,
          CardContent,
          Alert,
        }),
      });
      setCompiledMDX(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "编译错误");
    } finally {
      setIsCompiling(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => compileMDX(mdxCode), 500);
    return () => clearTimeout(timer);
  }, [mdxCode, compileMDX]);

  // 同步滚动：编辑器 -> 预览
  const handleEditorScroll = () => {
    if (syncingRef.current || !editorRef.current || !previewRef.current) return;

    syncingRef.current = true;
    const editor = editorRef.current;
    const preview = previewRef.current;

    // 计算滚动百分比
    const scrollPercentage =
      editor.scrollTop / (editor.scrollHeight - editor.clientHeight);

    // 同步到预览区域
    preview.scrollTop =
      scrollPercentage * (preview.scrollHeight - preview.clientHeight);

    setTimeout(() => {
      syncingRef.current = false;
    }, 10);
  };

  // 同步滚动：预览 -> 编辑器
  const handlePreviewScroll = () => {
    if (syncingRef.current || !editorRef.current || !previewRef.current) return;

    syncingRef.current = true;
    const editor = editorRef.current;
    const preview = previewRef.current;

    // 计算滚动百分比
    const scrollPercentage =
      preview.scrollTop / (preview.scrollHeight - preview.clientHeight);

    // 同步到编辑器
    editor.scrollTop =
      scrollPercentage * (editor.scrollHeight - editor.clientHeight);

    setTimeout(() => {
      syncingRef.current = false;
    }, 10);
  };

  const handleCopy = () => navigator.clipboard.writeText(mdxCode);
  const handleDownload = () => {
    const blob = new Blob([mdxCode], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.mdx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-background fixed inset-0 flex flex-col">
      {/* 顶部工具栏 */}
      <div className="bg-background/95 shrink-0 border-b backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
            <div>
              <h1 className="text-lg font-bold">MDX 在线编辑器</h1>
              <p className="text-muted-foreground text-xs">
                实时编辑和预览 MDX 文档
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2 md:hidden"
            >
              {showPreview ? (
                <>
                  <Code className="h-4 w-4" />
                  编辑
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  预览
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">复制</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">下载</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 主编辑区域 - 固定高度，等宽布局 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：编辑器 - 固定 50% 宽度 */}
        <div
          className={`flex flex-col border-r ${showPreview ? "hidden md:flex md:w-1/2" : "flex w-full"}`}
        >
          <div className="bg-muted/50 shrink-0 border-b px-4 py-2 text-sm font-medium">
            📝 编辑器
          </div>
          <textarea
            ref={editorRef}
            value={mdxCode}
            onChange={(e) => setMdxCode(e.target.value)}
            onScroll={handleEditorScroll}
            className="bg-background w-full flex-1 resize-none overflow-auto p-4 font-mono text-sm focus:outline-none"
            placeholder="在这里输入 MDX 代码..."
            spellCheck={false}
          />
        </div>

        {/* 右侧：预览 - 固定 50% 宽度 */}
        <div
          className={`flex flex-col ${showPreview ? "flex w-full md:w-1/2" : "hidden"}`}
        >
          <div className="bg-muted/50 flex shrink-0 items-center justify-between border-b px-4 py-2 text-sm font-medium">
            <span>👁️ 预览</span>
            {isCompiling && (
              <span className="text-muted-foreground text-xs">编译中...</span>
            )}
          </div>
          <div
            ref={previewRef}
            onScroll={handlePreviewScroll}
            className="flex-1 overflow-auto p-4 md:p-8"
          >
            {error ? (
              <Alert className="border-destructive">
                <AlertCircle className="h-4 w-4" />
                <div className="ml-2">
                  <div className="font-semibold">编译错误</div>
                  <pre className="mt-2 text-xs whitespace-pre-wrap">
                    {error}
                  </pre>
                </div>
              </Alert>
            ) : compiledMDX ? (
              <article className="max-w-none">
                <compiledMDX.default />
              </article>
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2" />
                  <p>正在编译...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* 底部状态栏 */}
      <div className="bg-muted/50 text-muted-foreground flex shrink-0 items-center justify-between border-t px-4 py-2 text-xs">
        <div className="flex items-center gap-4">
          <span>字符数: {mdxCode.length}</span>
          <span>行数: {mdxCode.split("\n").length}</span>
        </div>
        <div>
          {error ? (
            <span className="text-destructive">❌ 编译失败</span>
          ) : isCompiling ? (
            <span>⏳ 编译中...</span>
          ) : (
            <span className="text-green-600">✅ 编译成功</span>
          )}
        </div>
      </div>
    </div>
  );
}
