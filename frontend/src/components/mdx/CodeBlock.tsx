import type { ReactNode } from "react";
import { Children, isValidElement, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy as CopyIcon } from "lucide-react";
import { MermaidChart } from "./MermaidChart";

type Props = React.HTMLAttributes<HTMLPreElement>;

const extractText = (node: ReactNode): string => {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("\n");
  if (isValidElement(node)) return extractText(node.props.children);
  return "";
};

export function CodeBlock(props: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const language = props.className?.match(/language-([\w-]+)/)?.[1] ?? "";
  const languageDisplay = language.toUpperCase() || "CODE";

  // 检查是否是 Mermaid 代码块
  const isMermaid = language === "mermaid";

  // 优先从 code 子元素读取原始文本，保证换行不丢失
  const rawChild = props.children as ReactNode;
  const directChild = isValidElement(rawChild)
    ? rawChild.props?.children
    : null;
  const rawText =
    typeof directChild === "string" ? directChild : extractText(rawChild);

  // 去掉首尾空行，保留中间换行
  const codeContent = rawText.replace(/^\n+|\n+$/g, "");

  // 用 DOM 文本兜底一次，避免高亮插件导致换行丢失
  const [chartCode, setChartCode] = useState<string | null>(null);

  useEffect(() => {
    if (!isMermaid) return;
    const domText = preRef.current?.textContent;
    const next = domText ? domText.trim() : codeContent;
    if (next !== chartCode) {
      setChartCode(next);
    }
  }, [chartCode, codeContent, isMermaid]);

  const handleCopy = async () => {
    const text =
      (isMermaid ? chartCode : codeContent) || preRef.current?.innerText || "";
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  // 如果是 Mermaid 代码块，渲染为图表
  if (isMermaid) {
    const chartToRender = chartCode;
    const hasChart = Boolean(chartCode);
    return (
      <div className="my-6">
        {hasChart ? (
          <MermaidChart chart={chartToRender!} />
        ) : (
          <div className="text-muted-foreground text-sm">正在准备图表…</div>
        )}
        {/* 可选：显示源代码 */}
        <details className="mt-4">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm">
            查看 Mermaid 源代码
          </summary>
          <div className="code-wrapper relative mt-2">
            <Button
              onClick={handleCopy}
              size="sm"
              variant="outline"
              className="absolute top-2 right-2 z-10 gap-1 transition-all duration-200"
            >
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
            <span className="absolute top-2 left-2 z-10 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white shadow">
              MERMAID
            </span>
            <pre ref={preRef} {...props} className={`${props.className} pt-12`}>
              {props.children}
            </pre>
          </div>
        </details>
      </div>
    );
  }

  // 普通代码块
  return (
    <div className="code-wrapper relative my-4">
      <div className="pointer-events-none absolute inset-0 rounded-lg border border-transparent" />
      <Button
        onClick={handleCopy}
        size="sm"
        variant="outline"
        className="sticky top-[clamp(12px,24vh,120px)] z-10 float-right mr-2 cursor-pointer gap-1 transition-all duration-200"
      >
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
      <span className="absolute top-2 left-2 z-10 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white shadow">
        {languageDisplay}
      </span>
      <pre ref={preRef} {...props} className={`${props.className} pt-12`}>
        {props.children}
      </pre>
    </div>
  );
}
