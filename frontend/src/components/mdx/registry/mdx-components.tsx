/**
 * MDX 组件注册中心
 *
 * 职责：只做组件映射，不包含业务逻辑
 *
 * 架构原则：
 * - 注册层只负责路由（哪个标签用哪个组件）
 * - 业务逻辑在组件内部处理
 * - 保持注册层简洁清晰
 */

import React from "react";
import { CodeBlock } from "../components/code-block";
import { InteractiveButton } from "../components/interactive-button";
import {
  createHeadingSlugger,
  extractTextFromReactNode,
} from "@/lib/heading-slug";

type ComponentProps = Record<string, unknown>;

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
  id?: string;
};

/**
 * 创建带 ID 和锚点的标题组件
 */
function createHeadingComponent(
  tag: string,
  slugger: (title: string) => string
) {
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
 * 创建 MDX 组件映射
 *
 * 每次调用都创建新实例，避免 slug 计数在不同文章之间串联
 */
export function createMdxComponents(): Record<
  string,
  React.ComponentType<ComponentProps>
> {
  const slugger = createHeadingSlugger();

  return {
    // 代码块：直接映射到 CodeBlock（内部处理 Mermaid 判断）
    pre: CodeBlock as React.ComponentType<ComponentProps>,

    // 标题：添加 ID 和锚点
    h1: createHeadingComponent(
      "h1",
      slugger
    ) as React.ComponentType<ComponentProps>,
    h2: createHeadingComponent(
      "h2",
      slugger
    ) as React.ComponentType<ComponentProps>,
    h3: createHeadingComponent(
      "h3",
      slugger
    ) as React.ComponentType<ComponentProps>,
    h4: createHeadingComponent(
      "h4",
      slugger
    ) as React.ComponentType<ComponentProps>,
    h5: createHeadingComponent(
      "h5",
      slugger
    ) as React.ComponentType<ComponentProps>,
    h6: createHeadingComponent(
      "h6",
      slugger
    ) as React.ComponentType<ComponentProps>,

    // 自定义组件
    InteractiveButton: InteractiveButton as React.ComponentType<ComponentProps>,
  };
}
