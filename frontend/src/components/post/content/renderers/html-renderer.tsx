import parse, {
  Element,
  HTMLReactParserOptions,
  Text,
  domToReact,
  DOMNode,
} from "html-react-parser";
import { MermaidDiagram } from "@/components/mdx/components/mermaid-diagram";
import { CodeBlock } from "@/components/mdx/components/code-block";
import { KatexMath } from "@/components/mdx/components/katex-math";
import { InteractiveButton } from "@/components/mdx/components/interactive-button";
import React from "react";
import { createHeadingSlugger } from "@/lib/heading-slug";

/**
 * 后端 HTML 渲染器
 *
 * 职责：将后端返回的 HTML 字符串转换为 React 元素
 *
 * 为什么这么复杂？
 * - HTML 是字符串，需要手动解析和识别
 * - 需要识别特殊元素（Mermaid、数学公式、自定义组件）
 * - 需要手动提取嵌套数据
 * - 需要手动创建 React 组件
 *
 * 对比 MDX 渲染器：
 * - MDX 编译器自动处理一切（10 行代码）
 * - HTML 渲染器需要手动处理（200 行代码）
 *
 * 这是必要的复杂度，不是代码写得不好。
 */

// 解析code代码块和标题的type
interface SimpleNode {
  type: string;
  data?: string;
  children?: SimpleNode[];
}

// 自定义组件
interface ComponentProps {
  message?: string;
  text?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

interface HtmlRendererProps {
  html: string;
  articleClassName: string;
}

export function HtmlRenderer({ html, articleClassName }: HtmlRendererProps) {
  const slugger = createHeadingSlugger();

  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (!(domNode instanceof Element)) return;

      // 1. 自定义组件 hydration
      if (domNode.attribs?.["data-component"]) {
        const componentType = domNode.attribs["data-component"];
        const props: ComponentProps = JSON.parse(
          domNode.attribs["data-props"] || "{}"
        );

        if (componentType === "interactive-button") {
          return (
            <InteractiveButton message={props.message}>
              {props.children || props.text || "点击我"}
            </InteractiveButton>
          );
        }
      }

      // 2. Mermaid 图表
      if (domNode.attribs?.class?.includes("mermaid")) {
        const firstChild = domNode.children[0];
        const code =
          firstChild && firstChild.type === "text"
            ? (firstChild as Text).data
            : "";
        return <MermaidDiagram code={code} />;
      }

      // 3. 代码块
      if (domNode.name === "pre") {
        const codeNode = domNode.children.find(
          (child): child is Element =>
            child instanceof Element && child.name === "code"
        );

        if (codeNode) {
          const codeClass = codeNode.attribs.class || "";
          let codeText = "";
          const extractText = (node: SimpleNode): void => {
            if (node.type === "text") {
              codeText += node.data || "";
            } else if (node.children) {
              node.children.forEach(extractText);
            }
          };
          (codeNode.children as unknown as SimpleNode[]).forEach(extractText);

          return (
            <CodeBlock>
              <code className={codeClass}>{codeText}</code>
            </CodeBlock>
          );
        }
      }

      // 4. 数学公式
      if (domNode.attribs?.class) {
        const isInline = domNode.attribs.class.includes("math-inline");
        const isBlock = domNode.attribs.class.includes("math-block");

        if (isInline || isBlock) {
          const firstChild = domNode.children[0];
          const latex =
            firstChild && firstChild.type === "text"
              ? (firstChild as Text).data
              : "";
          return <KatexMath latex={latex} isBlock={isBlock} />;
        }
      }

      // 5. 标题添加 ID
      if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(domNode.name)) {
        const id = domNode.attribs?.id;

        if (id) {
          // 后端已经添加了 ID
          return React.createElement(
            domNode.name,
            { id, className: "scroll-mt-24" },
            domToReact(domNode.children as DOMNode[], options)
          );
        }

        // 前端生成 ID, 如果后端没有id

        let headerText = "";
        const extractTextRecursive = (node: unknown): void => {
          const n = node as {
            type?: string;
            data?: string;
            children?: unknown[];
          };
          if (n.type === "text" && n.data) {
            headerText += n.data;
          } else if (n.children && Array.isArray(n.children)) {
            n.children.forEach(extractTextRecursive);
          }
        };

        if (domNode.children) {
          (domNode.children as unknown[]).forEach(extractTextRecursive);
        }

        const generatedId = slugger(headerText);
        return React.createElement(
          domNode.name,
          { id: generatedId, className: "scroll-mt-24" },
          domToReact(domNode.children as DOMNode[], options)
        );
      }
    },
  };

  return <article className={articleClassName}>{parse(html, options)}</article>;
}
