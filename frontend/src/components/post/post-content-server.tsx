import parse, {
  Element,
  HTMLReactParserOptions,
  Text,
  domToReact,
  DOMNode,
} from "html-react-parser";
import { MermaidDiagram } from "@/components/mdx/mermaid-diagram";
import { CodeBlock } from "@/components/mdx/code-block";
import { KatexMath } from "@/components/mdx/katex-math";
import { InteractiveButton } from "@/components/mdx/interactive-button";
import React from "react";

interface SimpleNode {
  type: string;
  data?: string;
  children?: SimpleNode[];
}

const generateId = (text: string) => {
  return text.toLowerCase().replace(/\./g, "").replace(/\s+/g, "-");
};

interface PostContentServerProps {
  html: string;
  className?: string;
}

export function PostContentServer({
  html,
  className = "",
}: PostContentServerProps) {
  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Element) {
        // 0. 自定义组件 hydration
        if (domNode.attribs && domNode.attribs["data-component"]) {
          const componentType = domNode.attribs["data-component"];
          const props = JSON.parse(domNode.attribs["data-props"] || "{}");

          if (componentType === "interactive-button") {
            return (
              <InteractiveButton text={props.text} message={props.message} />
            );
          }

          // Alert 和 Callout 不需要 hydration，直接用 HTML
        }

        // A. Mermaid 图表
        if (
          domNode.attribs &&
          domNode.attribs.class &&
          domNode.attribs.class.includes("mermaid")
        ) {
          const firstChild = domNode.children[0];
          const code =
            firstChild && firstChild.type === "text"
              ? (firstChild as Text).data
              : "";
          return <MermaidDiagram code={code} />;
        }

        // B. 代码块
        if (domNode.name === "pre") {
          const codeNode = domNode.children.find(
            (child): child is Element =>
              child instanceof Element && child.name === "code"
          );

          if (codeNode) {
            const codeClass = codeNode.attribs.class || "";
            let codeText = "";
            const extractText = (node: SimpleNode) => {
              if (node.type === "text") {
                codeText += node.data || "";
              } else if (node.children) {
                node.children.forEach(extractText);
              }
            };
            (codeNode.children as any[]).forEach(extractText);

            return <CodeBlock className={codeClass} code={codeText} />;
          }
        }

        // C. 数学公式
        if (domNode.attribs && domNode.attribs.class) {
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

        // D. 标题添加 ID
        if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(domNode.name)) {
          let headerText = "";
          const extractTextRecursive = (node: any) => {
            if (node.type === "text") {
              headerText += node.data || "";
            } else if (node.children) {
              node.children.forEach(extractTextRecursive);
            }
          };

          if (domNode.children) {
            domNode.children.forEach(extractTextRecursive);
          }

          const id = domNode.attribs.id || generateId(headerText);
          return React.createElement(
            domNode.name,
            { id, className: "scroll-mt-24" },
            domToReact(domNode.children as DOMNode[], options)
          );
        }
      }
    },
  };

  const articleClassName = `
    prose prose-lg dark:prose-invert max-w-none
    prose-headings:scroll-mt-20
    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
    prose-code:before:content-none prose-code:after:content-none
    prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5
    prose-img:rounded-lg prose-img:shadow-md
    ${className}
  `;

  return <article className={articleClassName}>{parse(html, options)}</article>;
}
