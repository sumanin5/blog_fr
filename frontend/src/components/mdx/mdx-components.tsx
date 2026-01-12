/**
 * MDX 自定义组件映射
 *
 * 目的：为 MDX 内容提供统一的组件渲染规则
 * 适用场景：
 *   1. 服务端渲染 (next-mdx-remote/rsc)
 *   2. 客户端渲染 (next-mdx-remote)
 *
 * 架构说明：
 *   - 静态组件（如代码高亮）尽量在服务端完成
 *   - 交互组件（如复制按钮）标记为 "use client"
 */

import React from "react";
import { MermaidDiagram } from "./mermaid-diagram";
import { CodeBlock } from "./code-block";
import { InteractiveButton } from "./interactive-button";
import {
  createHeadingSlugger,
  extractTextFromReactNode,
} from "@/lib/heading-slug";

/**
 * MDX 组件类型定义
 */
type ComponentProps = Record<string, unknown>;

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
  id?: string;
};

function createHeadingComponent(tag: string, slugger: (title: string) => string) {
  return function Heading(props: HeadingProps) {
    const text = extractTextFromReactNode(props.children);
    const id = props.id || slugger(text);

    return React.createElement(
      tag,
      {
        ...props,
        id,
        className: ["scroll-mt-24", props.className].filter(Boolean).join(" "),
      },
      props.children
    );
  };
}

/**
 * 每次渲染都创建一套新的 components，避免 slug 计数在不同文章之间串联。
 */
export function createMdxComponents(): Record<
  string,
  React.ComponentType<ComponentProps>
> {
  const slugger = createHeadingSlugger();

  return {
    // 代码块处理：识别 Mermaid 图表和普通代码
    pre: (props: React.ComponentPropsWithoutRef<"pre">) => {
      const childrenArray = React.Children.toArray(props.children);
      const child = childrenArray[0];

      if (React.isValidElement<{ children?: React.ReactNode; className?: string }>(child) && child.type === "code") {
        const code = child.props.children;
        const className = child.props.className || "";
        const lang = className.replace("language-", "");

        // Mermaid 图表渲染（客户端组件）
        if (lang === "mermaid") {
          return <MermaidDiagram code={code} />;
        }

        // 普通代码块渲染（支持语法高亮 + 复制按钮）
        return <CodeBlock code={code} className={className} />;
      }
      return <pre {...props} />;
    },

    h1: createHeadingComponent("h1", slugger),
    h2: createHeadingComponent("h2", slugger),
    h3: createHeadingComponent("h3", slugger),
    h4: createHeadingComponent("h4", slugger),
    h5: createHeadingComponent("h5", slugger),
    h6: createHeadingComponent("h6", slugger),

    // 交互式按钮组件（客户端组件，支持 onClick 等事件）
    InteractiveButton,
  };
}
