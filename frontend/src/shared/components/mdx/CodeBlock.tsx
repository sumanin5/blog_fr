/**
 * 📝 代码块组件 (CodeBlock)
 *
 * 这是一个智能的代码块组件，可以处理普通代码高亮和 Mermaid 图表渲染。
 *
 * 主要功能:
 * 1. 🎨 语言检测：从 className 中提取语言类型
 * 2. 🔄 文本提取：从 React 节点树中递归提取纯文本
 * 3. 📋 一键复制：复制代码内容到剪贴板
 * 4. 📊 Mermaid 集成：自动识别并渲染 Mermaid 图表
 * 5. 🔍 DOM 备用：当 React 数据不准确时，使用 DOM 文本作为后备
 *
 * 技术亮点:
 * - 递归文本提取算法处理复杂的 React 节点结构
 * - DOM + React 双重文本获取机制保证准确性
 * - 条件渲染：根据语言类型选择不同的渲染方式
 */
import type { ReactNode } from "react";
import { isValidElement, useMemo, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Check, Copy as CopyIcon } from "lucide-react";
import { MermaidChart } from "./MermaidChart";

// HTML 属性类型定义
type Props = React.HTMLAttributes<HTMLPreElement>;

/* ========== 🔍 文本提取算法 ========== */
/**
 * 递归文本提取函数
 *
 * 这是一个核心算法，用于从复杂的 React 节点结构中提取纯文本。
 * React 的 children 可能是字符串、数字、数组、对象等多种类型，
 * 需要递归处理所有情况。
 *
 * @param node - React 节点（可能是任意类型）
 * @returns 提取到的纯文本字符串
 */
const extractText = (node: ReactNode): string => {
  // 空值和布尔值处理
  if (node == null || typeof node === "boolean") return "";

  // 原始类型：字符串和数字直接返回
  if (typeof node === "string" || typeof node === "number") return String(node);

  // 数组类型：递归处理每个元素，直接连接（不添加换行符）
  if (Array.isArray(node)) return node.map(extractText).join("");

  // React 元素：递归处理 children 属性
  if (isValidElement(node)) {
    const nodeProps = node.props as { children?: unknown };
    return extractText((nodeProps.children ?? null) as ReactNode);
  }

  // 其他情况返回空字符串
  return "";
};

export function CodeBlock(props: Props) {
  /* ========== 📎 DOM 引用和状态 ========== */
  const preRef = useRef<HTMLPreElement>(null); // 获取 <pre> 元素的 DOM 引用
  const [copied, setCopied] = useState(false); // 复制状态管理

  /* ========== 🎨 语言检测 ========== */
  // 从 CSS 类名中提取语言类型，例如："language-javascript" → "javascript"
  const language = props.className?.match(/language-([\w-]+)/)?.[1] ?? "";
  const languageDisplay = language.toUpperCase() || "CODE"; // 用于显示的大写标签

  // 核心判断：是否为 Mermaid 图表代码
  const isMermaid = language === "mermaid";

  /* ========== 🔄 文本提取策略 ========== */
  // 策略 1：从 React 节点结构中提取
  const rawChild = props.children as ReactNode;

  // 优先处理直接的字符串内容
  let rawText = "";
  if (typeof rawChild === "string") {
    rawText = rawChild;
  } else if (isValidElement(rawChild)) {
    const nodeProps = rawChild.props as { children?: unknown };
    const directChild = nodeProps.children;

    // 如果直接子元素是字符串，使用它；否则递归提取
    if (typeof directChild === "string") {
      rawText = directChild;
    } else {
      rawText = extractText(rawChild);
    }
  } else {
    rawText = extractText(rawChild);
  }

  // 清理文本：去除首尾空行，保留中间的换行符
  const codeContent = rawText.replace(/^\n+|\n+$/g, "");

  /* ========== 🔍 DOM 备用机制 ========== */
  // 策略 2：使用 DOM 文本作为后备，防止高亮插件导致换行丢失
  // const [chartCode, setChartCode] = useState<string | null>(null);

  // useEffect(() => {
  //   // 只在 Mermaid 模式下才执行 DOM 备用逻辑
  //   if (!isMermaid) return;

  //   // 从 DOM 元素获取实际文本内容
  //   const domText = preRef.current?.textContent;

  //   // 选择最佳数据源：DOm 文本优先，否则使用 React 提取的文本
  //   const next = domText ? domText.trim() : codeContent;

  //   // 只在数据变化时才更新状态，避免无必要的重新渲染
  //   if (next !== chartCode) {
  //     setChartCode(next);
  //   }
  // }, [chartCode, codeContent, isMermaid]); // 依赖数组
  // 🔍 简化版本 - 直接使用修复后的文本提取结果
  const chartCode = useMemo(() => {
    if (!isMermaid) return null;
    return codeContent || null;
  }, [isMermaid, codeContent]);

  /* ========== 📋 复制功能 ========== */
  const handleCopy = async () => {
    // 根据代码类型选择数据源
    const text =
      (isMermaid ? chartCode : codeContent) || // Mermaid 使用 chartCode，普通代码使用 codeContent
      preRef.current?.innerText || // 后备方案 1：DOM innerText
      ""; // 后备方案 2：空字符串

    // 早期返回：如果没有可复制的内容
    if (!text) return;

    // 使用现代浏览器 Clipboard API
    await navigator.clipboard.writeText(text);

    // UI 反馈：显示复制成功状态
    setCopied(true);
    // 1.2秒后恢复正常状态
    setTimeout(() => setCopied(false), 1200);
  };

  /* ========== 📊 Mermaid 模式渲染 ========== */
  // 如果是 Mermaid 代码块，渲染为交互式图表
  if (isMermaid) {
    const chartToRender = chartCode; // 使用 DOM 备用机制得到的最终数据
    const hasChart = Boolean(chartCode); // 检查是否有有效的图表数据

    return (
      <div className="my-6">
        {/* 条件渲染：有数据时显示图表，否则显示加载提示 */}
        {hasChart ? (
          <MermaidChart chart={chartToRender!} />
        ) : (
          <div className="text-muted-foreground text-sm">正在准备图表…</div>
        )}

        {/* 可折叠的源代码显示 */}
        <details className="mt-4">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm">
            查看 Mermaid 源代码
          </summary>

          {/* 源代码容器：包含复制按钮和代码块 */}
          <div className="code-wrapper relative mt-2">
            {/* 复制按钮：绝对定位在右上角 */}
            <Button
              onClick={handleCopy}
              size="sm"
              variant="outline"
              className="absolute top-2 right-2 z-10 gap-1 transition-all duration-200"
            >
              {/* 动态图标：根据复制状态切换 */}
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <CopyIcon className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>

            {/* 语言标签：绝对定位在左上角 */}
            <span className="absolute top-2 left-2 z-10 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white shadow">
              MERMAID
            </span>

            {/* 实际的 <pre> 元素：保留原始属性，添加上内边距 */}
            <pre ref={preRef} {...props} className={`${props.className} pt-12`}>
              {props.children}
            </pre>
          </div>
        </details>
      </div>
    );
  }

  /* ========== 📝 普通代码模式渲染 ========== */
  return (
    <div className="code-wrapper relative my-4">
      {/* 装饰边框：透明边框，纯装饰作用 */}
      <div className="pointer-events-none absolute inset-0 rounded-lg border border-transparent" />

      {/* 复制按钮：粘性定位，跟随滚动 */}
      <Button
        onClick={handleCopy}
        size="sm"
        variant="outline"
        className="sticky top-[clamp(12px,24vh,120px)] z-10 float-right mr-2 cursor-pointer gap-1 transition-all duration-200"
      >
        {/* 动态按钮内容 */}
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Copied!
          </>
        ) : (
          <>
            <CopyIcon className="h-4 w-4" />
            Copy
          </>
        )}
      </Button>

      {/* 语言标签：显示代码语言类型 */}
      <span className="absolute top-2 left-2 z-10 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white shadow">
        {languageDisplay}
      </span>

      {/* 主体代码块：保留所有原始属性，添加上内边距避免遮挡 */}
      <pre
        ref={preRef}
        {...props}
        className={`${props.className} overflow-x-auto rounded-lg pt-12`}
      >
        {props.children}
      </pre>
    </div>
  );
}
