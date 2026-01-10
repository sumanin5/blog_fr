"use client";

import { useEffect, useState, useMemo } from "react";
// import { useTheme } from "next-themes";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const MermaidDiagram = ({ code }: { code: string }) => {
  // const { theme, resolvedTheme } = useTheme();
  // State for the rendered SVG content
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Unique ID for mermaid to render into (phantom)
  const chartId = useMemo(
    () => `mermaid-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  useEffect(() => {
    let isMounted = true;

    // Determine the actual theme for mermaid
    const mermaidTheme = "dark";
    // resolvedTheme === "dark"
    // ||
    // (theme === "system" &&
    //   window.matchMedia("(prefers-color-scheme: dark)").matches)
    //   ? "dark"
    //   : "default";

    const render = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);

      // Pre-check for empty content
      if (!code.trim()) {
        setIsLoading(false);
        return;
      }

      try {
        const mermaid = (await import("mermaid")).default;

        // Use standard initialization
        mermaid.initialize({
          startOnLoad: false,
          // Use 'base' theme for better customization or stick to pre-defined
          theme: mermaidTheme,
          securityLevel: "loose",
          flowchart: { useMaxWidth: true, htmlLabels: true },
          sequence: { useMaxWidth: true },
          gantt: { useMaxWidth: false },
        });

        // The render API returns an object { svg: string }
        // It renders into a hidden div in the DOM temporarily
        const { svg } = await mermaid.render(chartId, code);

        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (e) {
        if (isMounted) {
          console.error("Mermaid Render Error:", e);
          setError(e instanceof Error ? e.message : "Mermaid syntax error");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    // Debounce slightly to avoid rapid re-renders during theme switch
    const timeout = setTimeout(render, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [code, chartId]);
  //, theme, resolvedTheme # 监听主题的变化

  // --- Render States ---

  // 1. Error State
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
            Code: {code.slice(0, 50)}...
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // 2. Normal / Loading State
  return (
    <div className="relative my-6 w-full flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-700 p-4 shadow-sm transition-colors">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-700/50 backdrop-blur-sm z-10 transition-opacity">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {/* Rendered SVG Container */}
      <div
        className={`w-full overflow-x-auto flex justify-center transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />

      {/* Source Code Toggle (Optional enhancement) */}
      <details className="mt-4 w-full">
        <summary className="text-xs text-muted-foreground cursor-pointer hover:underline text-center">
          查看源码
        </summary>
        <pre className="mt-2 p-2 bg-slate-800 rounded text-xs overflow-x-auto text-slate-300">
          {code}
        </pre>
      </details>
    </div>
  );
};
