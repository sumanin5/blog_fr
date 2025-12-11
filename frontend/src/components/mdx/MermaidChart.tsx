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
  const [chartId] = useState(() => id || `mermaid-chart-${++globalCounter}`);

  useEffect(() => {
    if (!mermaidInitialized) {
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
          const { svg } = await mermaid.render(chartId, chart);
          elementRef.current.innerHTML = svg;

          const svgEl = elementRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.setAttribute("width", "100%");
            svgEl.setAttribute("height", "auto");
            svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
            svgEl.style.display = "block";
            svgEl.style.maxWidth = "100%";
            svgEl.style.minWidth = "min(90vw, 640px)";
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
  }, [chart, chartId]);

  return (
    <div className="my-6 flex justify-center">
      <div
        ref={elementRef}
        className="mermaid-chart max-w-full overflow-x-auto"
        style={{
          minHeight: "140px",
          minWidth: "min(92vw, 520px)",
          maxWidth: "1080px",
          width: "min(100%, 1080px)",
          backgroundColor: "#f5f5f5",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
        }}
      />
    </div>
  );
}
