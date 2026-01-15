/**
 * CodeBlock 组件
 *
 * 职责：
 * 1. 接收 pre 标签的 props，提取 code 内容
 * 2. 判断是 Mermaid 图表还是普通代码
 * 3. 渲染对应的组件
 */

import React from "react";
import hljs from "highlight.js";
import { MermaidDiagram } from "./mermaid-diagram";
import { CopyButton } from "../utils/copy-button";

/**
 * 从 pre 标签的 children 中提取代码内容和语言
 */
function extractCodeInfo(children: React.ReactNode): {
  code: string;
  language: string;
  className: string;
} {
  const childrenArray = React.Children.toArray(children);
  const child = childrenArray[0];

  if (
    React.isValidElement<{ children?: React.ReactNode; className?: string }>(
      child
    ) &&
    child.type === "code"
  ) {
    const code =
      typeof child.props.children === "string" ? child.props.children : "";
    const className = child.props.className || "";
    const language = className.replace("language-", "");

    return { code, language, className };
  }

  return { code: "", language: "", className: "" };
}

/**
 * CodeBlock 组件 - 处理所有代码块渲染
 */
export function CodeBlock(props: React.ComponentPropsWithoutRef<"pre">) {
  const { code, language, className } = extractCodeInfo(props.children);

  // 如果没有提取到代码，返回原始 pre 标签
  if (!code) {
    return <pre {...props} />;
  }

  // 判断是否为 Mermaid 图表
  if (language === "mermaid") {
    return <MermaidDiagram code={code} />;
  }

  // 普通代码高亮
  let highlightedCode = code;
  try {
    if (language && hljs.getLanguage(language)) {
      highlightedCode = hljs.highlight(code, { language }).value;
    } else {
      highlightedCode = hljs.highlightAuto(code).value;
    }
  } catch (err) {
    console.error("Highlight.js error:", err);
  }

  return (
    <div className="relative my-4 group rounded-lg border bg-muted/50">
      {/* Header / Actions Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50 rounded-t-lg">
        {/* Language Badge */}
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {language || "TEXT"}
        </span>

        {/* Copy Button - 客户端组件 */}
        <CopyButton code={code} />
      </div>

      {/* Code Area */}
      <div className="overflow-x-auto p-4 pt-2">
        <pre className="m-0! p-0! bg-transparent">
          <code
            className={`hljs ${className || ""} bg-transparent p-0! border-0`}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      </div>
    </div>
  );
}
