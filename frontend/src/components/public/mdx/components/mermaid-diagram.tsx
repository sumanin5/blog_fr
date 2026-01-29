"use client";

import { useEffect, useState, useMemo } from "react";
import { useTheme } from "next-themes";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CopyButton } from "../utils/copy-button";

/**
 * Mermaid 流程图组件
 *
 * 职责：
 * 1. 接收 Mermaid 源码字符串
 * 2. 动态加载 Mermaid 库（按需加载，优化性能）
 * 3. 将源码渲染为 SVG
 * 4. 处理加载状态和错误
 */
export const MermaidDiagram = ({ code }: { code: string }) => {
  const { resolvedTheme } = useTheme();
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const chartId = useMemo(
    () => `mermaid-${Math.random().toString(36).slice(2, 9)}`,
    [resolvedTheme]
  );

  useEffect(() => {
    let isMounted = true;
    if (!resolvedTheme) return;

    const mermaidTheme = resolvedTheme === "light" ? "neutral" : "dark";

    const render = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);

      if (!code.trim()) {
        setIsLoading(false);
        return;
      }

      try {
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: mermaidTheme,
          securityLevel: "loose",
          flowchart: { useMaxWidth: true, htmlLabels: true },
          sequence: { useMaxWidth: true },
          gantt: { useMaxWidth: false },
        });

        const { svg } = await mermaid.render(chartId, code);

        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (e) {
        if (isMounted) {
          console.error("Mermaid 渲染错误:", e);
          setError(e instanceof Error ? e.message : "Mermaid 语法错误");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    render();

    return () => {
      isMounted = false;
    };
  }, [code, chartId, resolvedTheme]);

  // 错误状态：显示错误提示
  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>无法渲染图表</AlertTitle>
        <AlertDescription className="mt-2">
          <pre className="text-xs whitespace-pre-wrap font-mono bg-black/10 p-2 rounded">
            {error}
          </pre>
          <div className="mt-2 text-xs opacity-70">
            代码: {code.slice(0, 50)}...
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // 正常状态：显示加载中或渲染完成的图表
  return (
    <div className="relative my-6 w-full flex flex-col items-center justify-center rounded-xl border border-border bg-muted p-4 shadow-sm transition-colors">
      {/* 加载中的动画 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm z-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* 渲染的 SVG 容器 */}
      <div
        className={`w-full overflow-x-auto flex justify-center transition-opacity duration-300 ${
          isLoading ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />

      {/* 可折叠的源码查看器 */}
      <details className="mt-4 w-full">
        <summary className="text-xs text-muted-foreground cursor-pointer hover:underline text-center">
          查看Mermaid源码
        </summary>
        <div className="relative my-4 group rounded-lg border bg-muted/50">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50 rounded-t-lg">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Mermaid
            </span>
            <CopyButton code={code} />
          </div>
          <div className="overflow-x-auto p-4 pt-2">
            <pre className="m-0 p-0 bg-transparent text-xs text-muted-foreground whitespace-pre-wrap">
              {code}
            </pre>
          </div>
        </div>
      </details>
    </div>
  );
};
