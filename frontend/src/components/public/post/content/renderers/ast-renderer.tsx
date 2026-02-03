import React from "react";
import { CodeBlock } from "@/components/public/mdx/components/code-block";
import { MermaidDiagram } from "@/components/public/mdx/components/mermaid-diagram";
import { KatexMath } from "@/components/public/mdx/components/katex-math";

interface AstRendererProps {
  ast: Record<string, unknown>;
  articleClassName: string;
}

export function AstRenderer({ ast, articleClassName }: AstRendererProps) {
  return <article className={articleClassName}>{renderNode(ast)}</article>;
}

function renderNode(node: Record<string, unknown>, i = 0): React.ReactNode {
  const { type, children, value, ...props } = node;
  const kids = children as Record<string, unknown>[] | undefined;

  // 辅助函数：渲染子节点
  const renderKids = () => kids?.map((c, j) => renderNode(c, j));

  switch (type) {
    case "root":
      return renderKids();
    case "text":
      return value as string;
    case "heading": {
      const Tag = `h${props.level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return (
        <Tag key={i} id={props.id as string | undefined}>
          {renderKids()}
        </Tag>
      );
    }
    case "paragraph":
      return <p key={i}>{renderKids()}</p>;
    case "code":
      return (
        <CodeBlock key={i}>
          <code className={props.lang ? `language-${props.lang}` : ""}>
            {value as string}
          </code>
        </CodeBlock>
      );
    case "code_inline":
      return <code key={i}>{value as string}</code>;
    case "mermaid":
      return <MermaidDiagram key={i} code={value as string} />;
    case "math":
      return (
        <KatexMath
          key={i}
          latex={value as string}
          isBlock={props.display === "block"}
        />
      );
    case "list": {
      const Tag = props.ordered ? "ol" : "ul";
      return <Tag key={i}>{renderKids()}</Tag>;
    }
    case "list-item":
      return <li key={i}>{renderKids()}</li>;
    case "link":
      return (
        <a
          key={i}
          href={props.href as string}
          title={props.title as string | undefined}
        >
          {renderKids()}
        </a>
      );
    case "image":
      return (
        <img
          key={i}
          src={props.src as string}
          alt={(props.alt as string) || ""}
          title={props.title as string | undefined}
          className="max-w-full h-auto"
        />
      );
    case "blockquote":
      return <blockquote key={i}>{renderKids()}</blockquote>;
    case "strong":
      return <strong key={i}>{renderKids()}</strong>;
    case "emphasis":
      return <em key={i}>{renderKids()}</em>;
    case "strikethrough":
      return <del key={i}>{renderKids()}</del>;
    case "break":
      return <br key={i} />;
    case "hr":
      return <hr key={i} />;
    case "table":
      return <table key={i}>{renderKids()}</table>;
    case "table-head":
      return <thead key={i}>{renderKids()}</thead>;
    case "table-body":
      return <tbody key={i}>{renderKids()}</tbody>;
    case "table-row":
      return <tr key={i}>{renderKids()}</tr>;
    case "table-cell":
      return <td key={i}>{renderKids()}</td>;
    case "html": {
      const HtmlTag = props.display === "block" ? "div" : "span";
      return (
        <HtmlTag
          key={i}
          dangerouslySetInnerHTML={{ __html: value as string }}
        />
      );
    }
    default:
      // 不支持的节点类型（包括 html）
      // 如果需要自定义组件或交互，请使用 MDX 渲染器
      if (process.env.NODE_ENV === "development") {
        console.warn(`Unsupported AST node type: ${type}`);
      }
      return null;
  }
}
