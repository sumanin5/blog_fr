/**
 * CodeBlock 组件
 *
 * 职责：
 * 1. 接收 pre 标签的 props，提取 code 内容
 * 2. 判断是 Mermaid 图表还是普通代码
 * 3. 渲染对应的组件
 */

import React from "react";
import {
  highlightMarkdownCode,
  normalizeCodeLanguage,
} from "@/lib/markdown/highlight";
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

  const normalizedLanguage = normalizeCodeLanguage(language);
  const languageLabel =
    normalizedLanguage === "plaintext" ? "text" : normalizedLanguage;

  // 普通代码高亮：与 TanStack Markdown 正文共用同一套 tokenizer
  let highlightedCode = code;
  try {
    highlightedCode = highlightMarkdownCode(code, normalizedLanguage);
  } catch (err) {
    console.error("TanStack Highlight error:", err);
  }

  return (
    <div className="group relative my-4 overflow-hidden rounded-lg border bg-muted/25">
      {/* Header / Actions Bar */}
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
        {/* Language Badge */}
        <span className="text-xs font-medium uppercase text-muted-foreground">
          {languageLabel}
        </span>

        {/* Copy Button - 客户端组件 */}
        <CopyButton code={code} />
      </div>

      {/* Code Area */}
      <pre className="tm-code m-0 overflow-x-auto p-4 text-[13px] leading-7" data-lang={normalizedLanguage}>
        <code
          className={`${className || `language-${normalizedLanguage}`} bg-transparent p-0! border-0`}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    </div>
  );
}
