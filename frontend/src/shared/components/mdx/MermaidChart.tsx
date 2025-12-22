import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidChartProps {
  chart: string;
  id?: string;
}

let globalCounter = 0;

export function MermaidChart({ chart, id }: MermaidChartProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  // 保证每个 Mermaid 图有唯一 ID；用户传入 id 则复用
  const [chartId] = useState(() => id || `mermaid-chart-${++globalCounter}`);

  // --- 尺寸策略 (已废弃，改用纯 CSS 自适应) ---
  // 之前的逻辑试图手动计算 SVG 尺寸，导致图表无法正确缩放。
  // 现在我们完全利用 Mermaid 的 useMaxWidth: true 和 CSS max-width: 100% 来处理。
  // --- 尺寸策略 (已废弃，改用纯 CSS 自适应) ---
  // 之前的逻辑试图手动计算 SVG 尺寸，导致图表无法正确缩放。
  // 现在我们完全利用 Mermaid 的 useMaxWidth: true 和 CSS max-width: 100% 来处理。

  useEffect(() => {
    // 每次渲染时都重新初始化 Mermaid，确保配置正确应用
    // 检测当前是否为暗色模式
    const isDarkMode = document.documentElement.classList.contains("dark");

    // Mermaid 全局配置：主题色、曲线、序列图/甘特图的默认布局
    mermaid.initialize({
      startOnLoad: false,
      theme: isDarkMode ? "dark" : "default",
      themeVariables: isDarkMode
        ? {
            // 暗色模式主题变量
            primaryColor: "#3b82f6",
            primaryTextColor: "#e5e7eb",
            primaryBorderColor: "#4b5563",
            lineColor: "#9ca3af",
            secondaryColor: "#374151",
            tertiaryColor: "#1f2937",
            background: "#1f2937",
            mainBkg: "#374151",
            nodeBorder: "#4b5563",
            clusterBkg: "#374151",
            titleColor: "#f3f4f6",
            edgeLabelBackground: "#374151",
          }
        : {
            // 亮色模式主题变量
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
        nodeSpacing: 50,
        rankSpacing: 50,
        padding: 15,
      },
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
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
        fontSize: 14,
        gridLineStartPadding: 35,
        leftPadding: 75,
        topPadding: 50,
      },
    });

    const renderChart = async () => {
      if (elementRef.current) {
        try {
          // 清空之前的内容
          elementRef.current.innerHTML = "";

          // 渲染图表
          // 渲染为 SVG，并插入容器
          const { svg } = await mermaid.render(chartId, chart);
          elementRef.current.innerHTML = svg;

          // 获取 SVG 元素
          const svgEl = elementRef.current.querySelector("svg");
          if (svgEl) {
            // 移除可能存在的硬编码宽高属性，完全交给 CSS 控制
            svgEl.removeAttribute("width");
            svgEl.removeAttribute("height");

            // 设置样式以确保自适应
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";

            // 确保 SVG 能够根据容器调整大小，保持比例
            // 如果 mermaid 生成的 svg 没有 preserveAspectRatio，我们可能会加上
            // 但通常 mermaid 生成的已经足够好
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
        className="mermaid-chart bg-card max-w-full overflow-x-auto"
        style={{
          // minHeight: "160px", 移除最小高度，避免对小图造成不必要的留白
          width: "100%",
          marginLeft: "auto",
          marginRight: "auto",
          backgroundColor: "transparent",
          // border: "1px solid #e5e7eb", // 移除边框，通常 Mermaid 自身不需要边框
          // borderRadius: "12px",
          // padding: "18px",
          // boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
          display: "flex",
          justifyContent: "center", // 让图表居中
          alignItems: "center",
        }}
      />
    </div>
  );
}
