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
import React from "react";

interface SimpleNode {
  type: string;
  data?: string;
  children?: SimpleNode[];
}

// --- Main Parser Logic ---
interface PostContentProps {
  html: string;
  className?: string;
}

// 在现有的 import 下面添加这个简单的 ID 生成函数
// 注意：这个逻辑需要和您后端生成 TOC ID 的逻辑保持一致
// 如果后端用的是 python-slugify，前端最好也尽量匹配
const generateId = (text: string) => {
  // trying to match backend behavior: remove dots, space to dash
  return text
    .toLowerCase()
    .replace(/\./g, "") // Remove dots
    .replace(/\s+/g, "-"); // Space to dash
};

export function PostContent({ html, className = "" }: PostContentProps) {
  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Element) {
        // A. Handle Mermaid: <div class="mermaid">...</div>
        if (
          domNode.attribs &&
          domNode.attribs.class &&
          domNode.attribs.class.includes("mermaid")
        ) {
          // 安全获取文本内容
          const firstChild = domNode.children[0];
          const code =
            firstChild && firstChild.type === "text"
              ? (firstChild as Text).data
              : "";
          return <MermaidDiagram code={code} />;
        }

        // B. Handle Code Blocks: <pre><code class="...">...</code></pre>
        // 注意：html-react-parser 遍历是深度的，如果只匹配 code 可能会丢失 pre 的上下文
        // 这里我们拦截 pre，如果有 code 子元素，就接管
        if (domNode.name === "pre") {
          const codeNode = domNode.children.find(
            (child): child is Element =>
              child instanceof Element && child.name === "code"
          );

          if (codeNode) {
            const codeClass = codeNode.attribs.class || "";
            // 递归获取所有文本子节点（处理可能存在的嵌套）
            let codeText = "";
            const extractText = (node: SimpleNode) => {
              if (node.type === "text") {
                codeText += node.data || "";
              } else if (node.children) {
                node.children.forEach(extractText);
              }
            };
            // Cast strictly enough to work down the tree
            (codeNode.children as any[]).forEach(extractText);

            return <CodeBlock className={codeClass} code={codeText} />;
          }
        }

        // C. Handle KaTeX: .math-inline or .math-block
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
        // ... (在 Meramid, CodeBlock, Katex 之后)

        // D. 处理标题：自动添加ID (h1-h6)
        if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(domNode.name)) {
          // --- 修改开始：更强健的递归提取 ---
          let headerText = "";
          const extractTextRecursive = (node: any) => {
            if (node.type === "text") {
              headerText += node.data || "";
            } else if (node.children) {
              node.children.forEach(extractTextRecursive);
            }
          };

          // 对所有子节点通过递归收集文本
          if (domNode.children) {
            domNode.children.forEach(extractTextRecursive);
          }
          // --- 修改结束 ---

          // 2. 如果标签本身还没有 ID，我们就根据文本生成一个
          const id = domNode.attribs.id || generateId(headerText);
          // 3. 构造新的带有 ID 的 React 元素
          return React.createElement(
            domNode.name,
            { id, className: "scroll-mt-24" },
            domToReact(domNode.children as DOMNode[], options)
          );
        }
      }
    },
  };

  return (
    <article
      className={`
        prose prose-lg dark:prose-invert max-w-none
        prose-headings:scroll-mt-20
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-code:before:content-none prose-code:after:content-none
        prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5
        prose-img:rounded-lg prose-img:shadow-md
        ${className}
      `}
    >
      {parse(html, options)}
    </article>
  );
}
