import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidChartProps {
  chart: string;
  id?: string;
}

let globalCounter = 0;
let mermaidInitialized = false;

export function MermaidChart({ chart, id }: MermaidChartProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  // 保证每个 Mermaid 图有唯一 ID；用户传入 id 则复用
  const [chartId] = useState(() => id || `mermaid-chart-${++globalCounter}`);

  // --- 尺寸策略 ---
  // 依据第一行关键字识别图类型，并按需求放大/缩小不同类别
  const chartTrimmed = chart.trim();
  const firstToken = chartTrimmed.split(/\s+/)[0] || "";

  // 放大/缩小倍率表：按你的要求针对具体图形做差异化缩放
  const sizeMultiplierMap: Record<string, number> = {
    stateDiagram: 0.5,
    "stateDiagram-v2": 0.5,
    journey: 2,
    pie: 0.8,
    classDiagram: 0.5,
    gantt: 2,
    graph: 0.5, // 基本流程图再缩小，约 50%
  };

  const multiplier = sizeMultiplierMap[firstToken] ?? 1; // 未列出的类型用 1x

  // 基准尺寸（未乘倍率）
  const baseContainerMin = 420;
  const baseContainerMax = 900;
  const baseSvgMin = 380;
  const baseSvgMax = 880;

  // 应用倍率并做上下限夹紧，避免极端尺寸
  const applyMultiplier = (value: number) => {
    const scaled = value * multiplier;
    const clamped = Math.min(1100, Math.max(260, scaled));
    return Math.round(clamped);
  };

  // 计算容器与 SVG 的最终宽度范围
  const containerMinWidth = applyMultiplier(baseContainerMin);
  const containerMaxWidth = applyMultiplier(baseContainerMax);
  const svgMinWidth = applyMultiplier(baseSvgMin);
  const svgMaxWidth = applyMultiplier(baseSvgMax);

  useEffect(() => {
    if (!mermaidInitialized) {
      // Mermaid 全局配置：主题色、曲线、序列图/甘特图的默认布局
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        themeVariables: {
          primaryColor: "#3b82f6",
          primaryTextColor: "#1f2937",
          primaryBorderColor: "#e5e7eb",
          lineColor: "#6b7280",
          secondaryColor: "#f3f4f6",
          tertiaryColor: "#ffffff",
        },
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: "basis",
        },
        sequence: {
          diagramMarginX: 50,
          diagramMarginY: 10,
          actorMargin: 50,
          width: 150,
          height: 65,
          boxMargin: 10,
          boxTextMargin: 5,
          noteMargin: 10,
          messageMargin: 35,
          mirrorActors: true,
          bottomMarginAdj: 1,
          useMaxWidth: true,
        },
        gantt: {
          titleTopMargin: 25,
          barHeight: 20,
          fontSize: 11,
          gridLineStartPadding: 35,
          leftPadding: 75,
          topPadding: 50,
        },
      });
      mermaidInitialized = true;
    }

    const renderChart = async () => {
      if (elementRef.current) {
        try {
          // 清空之前的内容
          elementRef.current.innerHTML = "";

          // 渲染图表
          // 渲染为 SVG，并插入容器
          const { svg } = await mermaid.render(chartId, chart);
          elementRef.current.innerHTML = svg;

          const svgEl = elementRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.setAttribute("width", "100%");
            svgEl.removeAttribute("height"); // 移除height属性，让CSS控制高度
            svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
            svgEl.style.display = "block";
            svgEl.style.width = "100%";
            svgEl.style.height = "auto"; // 使用CSS的height: auto
            svgEl.style.maxWidth = `${svgMaxWidth}px`;
            svgEl.style.minWidth = `${svgMinWidth}px`;
          }
        } catch (error) {
          console.error("Mermaid rendering error:", error);
          console.log("Chart content:", JSON.stringify(chart));
          elementRef.current.innerHTML = `
            <div class="p-4 border border-red-200 bg-red-50 rounded-lg">
              <p class="text-red-600 font-medium">图表渲染错误</p>
              <p class="text-sm text-gray-600 mt-1">图表内容: "${chart}"</p>
              <pre class="text-sm text-red-500 mt-2 overflow-x-auto">${error}</pre>
            </div>
          `;
        }
      }
    };

    renderChart();
  }, [chart, chartId, svgMaxWidth, svgMinWidth]);

  return (
    <div className="my-6 flex justify-center">
      <div
        ref={elementRef}
        className="mermaid-chart max-w-full overflow-x-auto"
        style={{
          minHeight: "160px",
          minWidth: `${containerMinWidth}px`,
          maxWidth: `${containerMaxWidth}px`,
          width: "100%",
          marginLeft: "auto",
          marginRight: "auto",
          backgroundColor: "#f5f5f5",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "18px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
        }}
      />
    </div>
  );
}
