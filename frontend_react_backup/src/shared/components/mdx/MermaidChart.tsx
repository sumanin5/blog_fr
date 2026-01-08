import { useEffect, useState, useMemo } from "react";
import mermaid from "mermaid";
import { useTheme } from "@/features/theme";
import { Loader2, AlertCircle } from "lucide-react";

interface MermaidChartProps {
  chart: string;
}

/**
 * 🧜‍♀️ Mermaid 流程图渲染组件 (V2 重构版)
 *
 * 核心改进：
 * 1. 移除所有手动尺寸计算，完全依赖 CSS 布局。
 * 2. 增加 Loading 状态，避免渲染时的闪烁。
 * 3. 增强错误处理，语法错误时显示友好提示。
 * 4. 自动响应主题变化 (Dark/Light)。
 */
export function MermaidChart({ chart }: MermaidChartProps) {
  const { theme } = useTheme();
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 生成唯一 ID (避免 React.useId 的冒号问题)
  const chartId = useMemo(
    () => `mermaid-${Math.random().toString(36).slice(2, 9)}`,
    [],
  );

  // 检测是否为甘特图
  const isGanttChart = useMemo(() => {
    return chart.trim().toLowerCase().startsWith("gantt");
  }, [chart]);

  useEffect(() => {
    // 1. 确保 mermaid 初始化
    // 我们在 useEffect 内部根据 theme 动态 re-init，确保颜色正确
    const currentTheme =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
        ? "dark"
        : "default";

    mermaid.initialize({
      startOnLoad: false,
      theme: currentTheme,
      // 关键配置：允许图表尽量宽，不要被默认值限制
      flowchart: { useMaxWidth: true, htmlLabels: true },
      sequence: { useMaxWidth: true },
      gantt: {
        useMaxWidth: false, // 改为false，让甘特图使用自然宽度
        leftPadding: 75,
        gridLineStartPadding: 35,
        fontSize: 18,
        sectionFontSize: 16, // 减小章节字体
        numberSectionStyles: 4,
        rightPadding: 75,
      },
      journey: { useMaxWidth: true },
      // 安全配置
      securityLevel: "loose",
    });

    // 2. 渲染函数
    const renderDiagram = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 预检查：空内容不渲染
        if (!chart.trim()) {
          setIsLoading(false);
          return;
        }

        // 核心渲染 API
        // mermaid.render 会返回一个 { svg: string } 对象
        // 注意：这里我们传入一个虚拟的 DOM id，mermaid 会在后台创建并计算，然后返回 svg 字符串
        const { svg } = await mermaid.render(chartId, chart);
        setSvgContent(svg);
      } catch (err) {
        console.error("Mermaid Render Error:", err);
        // Mermaid 报错时通常会抛出具体信息
        setError(err instanceof Error ? err.message : "流程图语法包含错误");
      } finally {
        setIsLoading(false);
      }
    };

    // 稍微 debounce 一下，避免 theme 快速切换导致竞态
    const timer = setTimeout(() => {
      renderDiagram();
    }, 100);

    return () => clearTimeout(timer);
  }, [chart, theme, chartId]);

  // --- 渲染状态分支 ---

  // 1. 错误状态
  if (error) {
    return (
      <div className="border-destructive/20 bg-destructive/5 text-destructive my-4 rounded-lg border p-4 text-sm">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-4 w-4" />
          <span>无法渲染流程图</span>
        </div>
        <pre className="mt-2 overflow-x-auto font-mono text-xs whitespace-pre-wrap opacity-80">
          {error}
        </pre>
        <div className="text-muted-foreground mt-2 text-xs">
          源代码：
          <code className="bg-muted ml-1 rounded px-1 py-0.5">{chart}</code>
        </div>
      </div>
    );
  }

  // 2. 加载/正常状态
  return (
    <div className="group bg-card/50 hover:bg-card/80 relative my-6 flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border p-6 transition-colors">
      {/* Loading 指示器 */}
      {isLoading && (
        <div className="bg-card/50 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      )}

      {/* SVG 容器 - 根据图表类型使用不同布局 */}
      {isGanttChart ? (
        // 甘特图：优先支持滚动，左对齐显示
        <div
          className={`not-prose w-full overflow-x-auto ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
          style={{
            lineHeight: 0,
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      ) : (
        // 其他图表：居中显示
        <div
          className={`not-prose w-full overflow-x-auto ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
          style={{
            lineHeight: 0,
            display: "flex",
            justifyContent: "center",
            minWidth: "fit-content",
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      )}
      {/* 嵌入式样式：强制覆盖全局 transition，防止 Mermaid 计算错乱 */}
      <style>{`
        #${chartId} * {
          transition: none !important;
        }
        #${chartId} svg {
          max-width: none !important;
          height: auto !important;
        }
        /* 甘特图优化 - 让它能够水平滚动 */
        #${chartId} .gantt .grid .tick text {
          font-size: 9px !important;
        }
        #${chartId} .gantt .sectionTitle {
          font-size: 16px !important;
        }
        /* 任务文字优化 */
        #${chartId} .gantt .taskText {
          font-size: 9px !important;
          font-weight: 500 !important;
        }
      `}</style>
    </div>
  );
}
